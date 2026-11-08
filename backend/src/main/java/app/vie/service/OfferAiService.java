package app.vie.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.*;

/**
 * Lit un prospectus de supermarché (PDF, photo ou texte collé) et en tire la liste des offres, avec pour chacune
 * la photo du produit découpée dans la page (l'IA indique où se trouve la photo). Rien n'est enregistré ici.
 * Un prospectus PDF est lu page par page (6 pages au maximum).
 */
@Service
public class OfferAiService {
    private static final Logger log = LoggerFactory.getLogger(OfferAiService.class);
    public static final int MAX_PAGES = 6;
    /** Magasins du Luxembourg acceptés. */
    public static final List<String> STORES = List.of("Cactus", "Naturata", "Delhaize", "Lidl", "Aldi");

    private static final String PROMPT = "Tu lis un prospectus de supermarché du Luxembourg. Réponds UNIQUEMENT par un objet JSON, sans texte autour : "
            + "{\"validUntil\": date de fin de validité au format AAAA-MM-JJ ou null, "
            + "\"offers\": [{\"product\": nom du produit avec marque et quantité si indiquées (80 caractères max), "
            + "\"price\": prix à payer en euros, nombre avec point décimal, "
            + "\"unit\": « pièce », « kg », « litre » ou le conditionnement (ex. « 500 g »), ou null, "
            + "\"box\": [x, y, largeur, hauteur] de la PHOTO de ce produit dans l'image, en fractions de l'image entre 0 et 1 (x et y = coin supérieur gauche), ou null si tu ne la vois pas}]}. "
            + "Ne garde que les produits ayant un prix clairement lisible. N'invente aucun produit ni aucun prix.";

    private final BillAiService ai;
    private final ObjectMapper mapper;

    public OfferAiService(BillAiService ai, ObjectMapper mapper) {
        this.ai = ai;
        this.mapper = mapper;
    }

    public static String canonicalStore(String s) {
        if (s == null) return null;
        for (String k : STORES) if (k.equalsIgnoreCase(s.trim())) return k;
        return null;
    }

    public Map<String, Object> extract(byte[] data, String contentType, String pasted) {
        List<Map<String, Object>> offers = new ArrayList<>();
        String[] validUntil = {null};
        Set<String> seen = new HashSet<>();
        if (pasted != null && !pasted.isBlank()) {
            String t = pasted.trim();
            page(ai.ask(PROMPT.replace("de la PHOTO de ce produit dans l'image", "(toujours null ici)"), t.length() > 12000 ? t.substring(0, 12000) : t, null), null, offers, validUntil, seen);
        } else {
            String type = contentType == null ? "" : contentType.toLowerCase();
            boolean ok = false;
            try {
                if (type.contains("pdf")) {
                    try (PDDocument doc = Loader.loadPDF(data)) {
                        PDFRenderer renderer = new PDFRenderer(doc);
                        PDFTextStripper stripper = new PDFTextStripper();
                        int n = Math.min(doc.getNumberOfPages(), MAX_PAGES);
                        for (int p = 0; p < n; p++) {
                            BufferedImage img = renderer.renderImageWithDPI(p, 110);
                            stripper.setStartPage(p + 1);
                            stripper.setEndPage(p + 1);
                            String t = stripper.getText(doc);
                            if (t != null && t.length() > 5000) t = t.substring(0, 5000);
                            try {
                                page(ai.ask(PROMPT, t != null && t.trim().length() > 30 ? "Texte de la page :\n" + t : null, jpeg(scale(img, 1400, 1400), 0.85f)), img, offers, validUntil, seen);
                                ok = true;
                            } catch (ResponseStatusException e) {
                                if (e.getStatusCode() == HttpStatus.SERVICE_UNAVAILABLE) throw e;
                                log.warn("Page {} du prospectus illisible : {}", p + 1, e.getReason());
                            }
                        }
                    }
                } else if (type.equals("image/jpeg") || type.equals("image/png") || type.equals("image/webp")) {
                    BufferedImage img = ImageIO.read(new ByteArrayInputStream(data));
                    if (img == null) throw Errors.bad("ERR_FILE_TYPE");
                    page(ai.ask(PROMPT, null, jpeg(scale(img, 1400, 1400), 0.85f)), img, offers, validUntil, seen);
                    ok = true;
                } else throw Errors.bad("ERR_FILE_TYPE");
            } catch (ResponseStatusException e) {
                throw e;
            } catch (Exception e) {
                log.warn("Prospectus illisible : {}", e.toString());
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "ERR_AI_FAILED");
            }
            if (!ok) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "ERR_AI_FAILED");
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("validUntil", validUntil[0]);
        out.put("offers", offers);
        return out;
    }

    private void page(String answer, BufferedImage img, List<Map<String, Object>> offers, String[] validUntil, Set<String> seen) {
        int a = answer.indexOf('{'), b = answer.lastIndexOf('}');
        if (a < 0 || b <= a) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "ERR_AI_FAILED");
        try {
            JsonNode j = mapper.readTree(answer.substring(a, b + 1));
            String vu = j.path("validUntil").asText("");
            if (validUntil[0] == null && vu.matches("\\d{4}-\\d{2}-\\d{2}")) validUntil[0] = vu;
            for (JsonNode o : j.path("offers")) {
                String product = o.path("product").asText("").trim();
                Double price = null;
                if (o.path("price").isNumber()) price = o.path("price").asDouble();
                else {
                    try { price = Double.parseDouble(o.path("price").asText("").replace(",", ".").replaceAll("[^0-9.]", "")); } catch (NumberFormatException ignored) { }
                }
                if (product.isEmpty() || price == null || price <= 0 || price > 5000) continue;
                if (!seen.add(product.toLowerCase() + "|" + price)) continue;
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("product", product.length() > 200 ? product.substring(0, 200) : product);
                m.put("price", price);
                String unit = o.path("unit").asText("").trim();
                m.put("unit", unit.isEmpty() || unit.equalsIgnoreCase("null") ? null : (unit.length() > 40 ? unit.substring(0, 40) : unit));
                m.put("photo", img == null ? null : crop(img, o.path("box")));
                offers.add(m);
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "ERR_AI_FAILED");
        }
    }

    /** Découpe la photo du produit (miniature JPEG en base64) ; null si la zone indiquée est absente ou absurde. */
    private static String crop(BufferedImage img, JsonNode box) {
        try {
            if (box == null || !box.isArray() || box.size() != 4) return null;
            double x = box.get(0).asDouble(-1), y = box.get(1).asDouble(-1), w = box.get(2).asDouble(-1), h = box.get(3).asDouble(-1);
            if (x < 0 || y < 0 || w < 0.04 || h < 0.04 || x >= 1 || y >= 1) return null;
            w = Math.min(w, 1 - x);
            h = Math.min(h, 1 - y);
            if (w * h > 0.5) return null;
            int px = (int) (x * img.getWidth()), py = (int) (y * img.getHeight());
            int pw = Math.max(1, (int) (w * img.getWidth())), ph = Math.max(1, (int) (h * img.getHeight()));
            pw = Math.min(pw, img.getWidth() - px);
            ph = Math.min(ph, img.getHeight() - py);
            if (pw < 20 || ph < 20) return null;
            byte[] jpg = jpeg(scale(img.getSubimage(px, py, pw, ph), 220, 220), 0.8f);
            return Base64.getEncoder().encodeToString(jpg);
        } catch (Exception e) {
            return null;
        }
    }

    private static BufferedImage scale(BufferedImage src, int maxW, int maxH) {
        double f = Math.min(1.0, Math.min((double) maxW / src.getWidth(), (double) maxH / src.getHeight()));
        int w = Math.max(1, (int) (src.getWidth() * f)), h = Math.max(1, (int) (src.getHeight() * f));
        BufferedImage out = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.setColor(java.awt.Color.WHITE);
        g.fillRect(0, 0, w, h);
        g.drawImage(src, 0, 0, w, h, null);
        g.dispose();
        return out;
    }

    private static byte[] jpeg(BufferedImage img, float quality) throws java.io.IOException {
        var writer = ImageIO.getImageWritersByFormatName("jpg").next();
        var param = writer.getDefaultWriteParam();
        param.setCompressionMode(javax.imageio.ImageWriteParam.MODE_EXPLICIT);
        param.setCompressionQuality(quality);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (var ios = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(ios);
            writer.write(null, new javax.imageio.IIOImage(img, null, null), param);
        } finally {
            writer.dispose();
        }
        return out.toByteArray();
    }
}
