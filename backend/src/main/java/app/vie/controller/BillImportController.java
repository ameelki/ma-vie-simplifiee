package app.vie.controller;

import app.vie.service.BillAiService;
import app.vie.service.Errors;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/** Import d'une facture (PDF / photo) : l'IA renvoie les champs pour pré-remplir le formulaire. Rien n'est enregistré ici. */
@RestController
@RequestMapping("/api/ai")
public class BillImportController {
    private static final long MAX = 8L * 1024 * 1024;
    private final BillAiService ai;

    public BillImportController(BillAiService ai) {
        this.ai = ai;
    }

    @GetMapping("/status")
    public Map<String, Boolean> status() {
        return Map.of("enabled", ai.enabled());
    }

    @PostMapping(value = "/bill", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> bill(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) throw Errors.bad("ERR_VALIDATION");
        if (file.getSize() > MAX) throw Errors.bad("ERR_FILE_TOO_BIG");
        return ai.extract(file.getBytes(), file.getContentType());
    }
}
