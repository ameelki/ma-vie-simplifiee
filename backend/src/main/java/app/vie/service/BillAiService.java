package app.vie.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Lit une facture (PDF ou photo) avec un modèle gratuit exécuté par Ollama et renvoie les champs du formulaire :
 * title, amount, dueDate (AAAA-MM-JJ), note. Le document n'est pas conservé et ne quitte pas votre serveur Ollama.
 * PDF : le texte est extrait directement ; s'il n'y en a pas (scan), la première page est convertie en image.
 */
@Service
public class BillAiService {
    private static final Logger log = LoggerFactory.getLogger(BillAiService.class);
    private static final String PROMPT = "Tu lis une facture ou un avis de paiement. Réponds UNIQUEMENT par un objet JSON, sans texte autour, "
            + "avec exactement ces clés : "
            + "\"title\" (nom du fournisseur et nature de la facture, 60 caractères max, ex. « Électricité – Enovos »), "
            + "\"amount\" (montant total TTC à payer, nombre avec point décimal, sans symbole), "
            + "\"dueDate\" (date limite de paiement au format AAAA-MM-JJ, ou la date de la facture si aucune échéance n'est indiquée, ou null), "
            + "\"note\" (numéro de facture ou référence de paiement, ou null). "
            + "\"category\" (une seule valeur parmi HOUSING, ENERGY, WATER, INTERNET, PHONE, INSURANCE, HEALTH, TAXES, OTHER ; HOUSING = loyer ou charges de logement, ENERGY = électricité ou gaz, TAXES = impôts ou taxes). "
            + "Si une information est introuvable, mets null. N'invente rien.";

    private final String url;
    private final String model;
    private final String apiUrl;
    private final String apiKey;
    private final String apiModel;
    private final boolean useApi;
    private final boolean switchOn;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    /**
     * Deux fournisseurs d'IA possibles :
     * - Ollama (gratuit, sur votre machine) : OLLAMA_URL, OLLAMA_MODEL ;
     * - une API compatible OpenAI (Gemini, Groq, OpenRouter… avec leur offre gratuite) : AI_API_KEY, AI_MODEL, AI_API_URL.
     * Si AI_API_KEY est renseignée, l'API est utilisée à la place d'Ollama.
     */
    public BillAiService(@Value("${app.ai.url:http://localhost:11434}") String url, @Value("${app.ai.model:gemma3:4b}") String model,
                         @Value("${app.ai.api-url:https://generativelanguage.googleapis.com/v1beta/openai}") String apiUrl,
                         @Value("${app.ai.api-key:}") String apiKey, @Value("${app.ai.api-model:}") String apiModel,
                         @Value("${app.ai.enabled:false}") boolean switchOn, ObjectMapper mapper) {
        this.switchOn = switchOn;
        this.url = url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
        this.model = model;
        apiUrl = apiUrl == null || apiUrl.isBlank() ? "https://generativelanguage.googleapis.com/v1beta/openai" : apiUrl.trim();
        this.apiUrl = apiUrl.endsWith("/") ? apiUrl.substring(0, apiUrl.length() - 1) : apiUrl;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.apiModel = apiModel == null ? "" : apiModel.trim();
        this.useApi = !this.apiKey.isEmpty();
        this.mapper = mapper;
    }

    /** Vrai si l'IA est utilisable : API configurée, ou serveur Ollama qui répond. */
    public boolean enabled() {
        if (!switchOn) return false; // interrupteur général : AI_ENABLED=true pour activer toutes les fonctions IA
        if (useApi) return !apiModel.isEmpty();
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(url + "/api/tags")).timeout(Duration.ofSeconds(2)).GET().build();
            return http.send(req, HttpResponse.BodyHandlers.discarding()).statusCode() / 100 == 2;
        } catch (Exception e) {
            return false;
        }
    }

    /** Envoie la question au fournisseur configuré et renvoie le texte de la réponse. */
    private String chat(String prompt, String text, byte[] img) {
        String content = text != null ? prompt + "\n\n" + text : prompt;
        try {
            return useApi ? chatApi(content, img, true) : chatOllama(content, img);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.warn("IA : {}", e.toString());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "ERR_AI_FAILED");
        }
    }

    private String chatOllama(String content, byte[] img) throws Exception {
        ObjectNode body = mapper.createObjectNode();
        body.put("model", model);
        body.put("stream", false);
        body.put("format", "json");
        body.putObject("options").put("temperature", 0).put("num_ctx", 8192);
        ObjectNode msg = body.putArray("messages").addObject();
        msg.put("role", "user");
        msg.put("content", content);
        if (img != null) msg.putArray("images").add(Base64.getEncoder().encodeToString(img));
        HttpRequest req = HttpRequest.newBuilder(URI.create(url + "/api/chat")).timeout(Duration.ofSeconds(300))
                .header("content-type", "application/json").POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body))).build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() / 100 != 2) {
            log.warn("Ollama : HTTP {} {}", res.statusCode(), res.body().length() > 300 ? res.body().substring(0, 300) : res.body());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "ERR_AI_FAILED");
        }
        return mapper.readTree(res.body()).path("message").path("content").asText("");
    }

    private static String mime(byte[] b) {
        if (b.length > 3 && (b[0] & 0xff) == 0x89 && b[1] == 'P') return "image/png";
        if (b.length > 11 && b[0] == 'R' && b[1] == 'I' && b[8] == 'W') return "image/webp";
        return "image/jpeg";
    }

    /** Format « chat/completions » d'OpenAI, repris par Gemini, Groq, OpenRouter… */
    private String chatApi(String content, byte[] img, boolean jsonMode) throws Exception {
        ObjectNode body = mapper.createObjectNode();
        body.put("model", apiModel);
        body.put("temperature", 0);
        if (jsonMode) body.putObject("response_format").put("type", "json_object");
        ObjectNode msg = body.putArray("messages").addObject();
        msg.put("role", "user");
        ArrayNode parts = msg.putArray("content");
        parts.addObject().put("type", "text").put("text", content);
        if (img != null) parts.addObject().put("type", "image_url").putObject("image_url").put("url", "data:" + mime(img) + ";base64," + Base64.getEncoder().encodeToString(img));
        HttpRequest req = HttpRequest.newBuilder(URI.create(apiUrl + "/chat/completions")).timeout(Duration.ofSeconds(120))
                .header("content-type", "application/json").header("authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body))).build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        int code = res.statusCode();
        if (code == 429) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "ERR_AI_BUSY");
        if (code == 400 && jsonMode) return chatApi(content, img, false); // certains fournisseurs refusent le mode JSON
        if (code / 100 != 2) {
            log.warn("API IA : HTTP {} {}", code, res.body().length() > 300 ? res.body().substring(0, 300) : res.body());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "ERR_AI_FAILED");
        }
        return mapper.readTree(res.body()).path("choices").path(0).path("message").path("content").asText("");
    }

    public Map<String, Object> extract(byte[] data, String contentType) {
        String type = contentType == null ? "" : contentType.toLowerCase();
        boolean pdf = type.contains("pdf");
        boolean image = type.equals("image/jpeg") || type.equals("image/png") || type.equals("image/webp");
        if (!pdf && !image) throw Errors.bad("ERR_FILE_TYPE");
        if (!enabled()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "ERR_AI_UNAVAILABLE");
        try {
            String text = null;
            byte[] img = null;
            if (pdf) {
                try (PDDocument doc = Loader.loadPDF(data)) {
                    String t = new PDFTextStripper().getText(doc);
                    if (t != null && t.trim().length() >= 40) text = t.length() > 8000 ? t.substring(0, 8000) : t;
                    else {
                        BufferedImage page = new PDFRenderer(doc).renderImageWithDPI(0, 150);
                        ByteArrayOutputStream out = new ByteArrayOutputStream();
                        ImageIO.write(page, "png", out);
                        img = out.toByteArray();
                    }
                }
            } else {
                img = data;
            }
            String answer = chat(PROMPT, text != null ? "Texte de la facture :\n" + text : null, img);
            int a = answer.indexOf('{'), b = answer.lastIndexOf('}');
            if (a < 0 || b <= a) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "ERR_AI_FAILED");
            JsonNode j = mapper.readTree(answer.substring(a, b + 1));
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("title", clean(j.path("title"), 200));
            out.put("amount", number(j.path("amount")));
            out.put("dueDate", date(j.path("dueDate")));
            out.put("note", clean(j.path("note"), 1000));
            String cat = clean(j.path("category"), 20);
            out.put("category", cat != null && java.util.Set.of("HOUSING", "ENERGY", "WATER", "INTERNET", "PHONE", "INSURANCE", "HEALTH", "TAXES", "OTHER").contains(cat.toUpperCase()) ? cat.toUpperCase() : null);
            return out;
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Lecture de facture impossible : {}", e.toString());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "ERR_AI_FAILED");
        }
    }

    /** Question libre au modèle (texte et/ou image), réponse JSON brute. Utilisé aussi pour lire les prospectus. */
    public String ask(String prompt, String text, byte[] img) {
        if (!enabled()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "ERR_AI_UNAVAILABLE");
        return chat(prompt, text, img);
    }

    private static String clean(JsonNode n, int max) {
        if (n == null || n.isNull() || n.isMissingNode()) return null;
        String s = n.asText("").trim();
        if (s.isEmpty() || s.equalsIgnoreCase("null")) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }

    private static Double number(JsonNode n) {
        if (n == null || n.isNull() || n.isMissingNode()) return null;
        if (n.isNumber()) return n.asDouble();
        try {
            return Double.parseDouble(n.asText("").replace(" ", "").replace(",", ".").replaceAll("[^0-9.\\-]", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String date(JsonNode n) {
        String s = clean(n, 10);
        return s != null && s.matches("\\d{4}-\\d{2}-\\d{2}") ? s : null;
    }
}
