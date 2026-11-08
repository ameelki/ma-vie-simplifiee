package app.vie.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Lit un prospectus de supermarché (PDF, photo ou texte collé) et en tire la liste des offres. Rien n'est enregistré ici. */
@Service
public class OfferAiService {
    private static final String PROMPT = "Tu lis un prospectus ou une liste de prix de supermarché. Réponds UNIQUEMENT par un objet JSON, sans texte autour : "
            + "{\"validUntil\": date de fin de validité au format AAAA-MM-JJ ou null, "
            + "\"offers\": [{\"product\": nom du produit avec marque et quantité si indiquées (80 caractères max), "
            + "\"price\": prix à payer en euros, nombre avec point décimal, \"unit\": « pièce », « kg », « litre » ou le conditionnement (ex. « 500 g ») ou null}]}. "
            + "Ne garde que les produits ayant un prix clairement lisible. N'invente aucun produit ni aucun prix.";

    private final BillAiService ai;
    private final ObjectMapper mapper;

    public OfferAiService(BillAiService ai, ObjectMapper mapper) {
        this.ai = ai;
        this.mapper = mapper;
    }

    public Map<String, Object> extract(byte[] data, String contentType, String pasted) {
        String text = pasted != null && !pasted.isBlank() ? pasted.trim() : null;
        byte[] img = null;
        if (text == null) {
            String type = contentType == null ? "" : contentType.toLowerCase();
            try {
                if (type.contains("pdf")) {
                    try (PDDocument doc = Loader.loadPDF(data)) {
                        String t = new PDFTextStripper().getText(doc);
                        if (t != null && t.trim().length() >= 80) text = t;
                        else {
                            ByteArrayOutputStream out = new ByteArrayOutputStream();
                            ImageIO.write(new PDFRenderer(doc).renderImageWithDPI(0, 150), "png", out);
                            img = out.toByteArray();
                        }
                    }
                } else if (type.equals("image/jpeg") || type.equals("image/png") || type.equals("image/webp")) {
                    img = data;
                } else throw Errors.bad("ERR_FILE_TYPE");
            } catch (ResponseStatusException e) {
                throw e;
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "ERR_AI_FAILED");
            }
        }
        if (text != null && text.length() > 12000) text = text.substring(0, 12000);
        String answer = ai.ask(PROMPT, text, img);
        int a = answer.indexOf('{'), b = answer.lastIndexOf('}');
        if (a < 0 || b <= a) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "ERR_AI_FAILED");
        try {
            JsonNode j = mapper.readTree(answer.substring(a, b + 1));
            List<Map<String, Object>> list = new ArrayList<>();
            for (JsonNode o : j.path("offers")) {
                String product = o.path("product").asText("").trim();
                Double price = null;
                if (o.path("price").isNumber()) price = o.path("price").asDouble();
                else {
                    try { price = Double.parseDouble(o.path("price").asText("").replace(",", ".").replaceAll("[^0-9.]", "")); } catch (NumberFormatException ignored) { }
                }
                if (product.isEmpty() || price == null || price <= 0 || price > 5000) continue;
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("product", product.length() > 200 ? product.substring(0, 200) : product);
                m.put("price", price);
                String unit = o.path("unit").asText("").trim();
                m.put("unit", unit.isEmpty() || unit.equalsIgnoreCase("null") ? null : (unit.length() > 40 ? unit.substring(0, 40) : unit));
                list.add(m);
            }
            String vu = j.path("validUntil").asText("");
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("validUntil", vu.matches("\\d{4}-\\d{2}-\\d{2}") ? vu : null);
            out.put("offers", list);
            return out;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "ERR_AI_FAILED");
        }
    }
}
