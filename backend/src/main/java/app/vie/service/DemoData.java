package app.vie.service;

import app.vie.entity.Entry;
import app.vie.entity.Enums;
import app.vie.entity.User;
import app.vie.repository.EntryRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Exemples de départ (dans la langue de l'utilisateur) pour découvrir l'application. */
@Service
public class DemoData {
    private final EntryRepository entries;

    public DemoData(EntryRepository entries) {
        this.entries = entries;
    }

    private static String t(String lang, String fr, String en, String de, String pt) {
        return switch (lang == null ? "fr" : lang) {
            case "en" -> en;
            case "de" -> de;
            case "pt" -> pt;
            default -> fr;
        };
    }

    private List<Entry> out;
    private Long owner;

    private Entry add(Enums.Module m, String title) {
        Entry e = new Entry();
        e.ownerId = owner;
        e.module = m;
        e.title = title;
        out.add(e);
        return e;
    }

    public List<Entry> seed(User u) {
        if (entries.countByOwnerId(u.id) > 0) return List.of();
        String l = u.lang;
        out = new ArrayList<>();
        owner = u.id;
        LocalDate today = LocalDate.now();

        String[][] budget = {
            {"INCOME", "INCOME", "2450", "0", "Salaire", "Salary", "Gehalt", "Salário"},
            {"EXPENSE", "HOUSING", "640", "1", "Loyer", "Rent", "Miete", "Renda"},
            {"EXPENSE", "FOOD", "320", "3", "Courses", "Groceries", "Lebensmittel", "Compras"},
            {"EXPENSE", "TRANSPORT", "160", "5", "Transport", "Transport", "Verkehr", "Transportes"},
            {"EXPENSE", "LEISURE", "120", "7", "Cinéma et sorties", "Cinema and outings", "Kino und Ausflüge", "Cinema e saídas"},
            {"EXPENSE", "HEALTH", "80", "9", "Pharmacie", "Pharmacy", "Apotheke", "Farmácia"},
            {"EXPENSE", "OTHER", "120", "11", "Divers", "Miscellaneous", "Sonstiges", "Diversos"},
        };
        for (String[] b : budget) {
            Entry e = add(Enums.Module.BUDGET, t(l, b[4], b[5], b[6], b[7]));
            e.kind = b[0];
            e.category = b[1];
            e.amount = new BigDecimal(b[2]);
            e.date = today.withDayOfMonth(1).plusDays(Long.parseLong(b[3]));
        }

        String[][] bills = {
            {"HOUSING", "820", "5", "PENDING", "Loyer", "Rent", "Miete", "Renda"},
            {"ENERGY", "68", "12", "PENDING", "Électricité", "Electricity", "Strom", "Eletricidade"},
            {"INTERNET", "39.90", "12", "PENDING", "Internet", "Internet", "Internet", "Internet"},
            {"PHONE", "29.90", "18", "PENDING", "Téléphone", "Phone", "Telefon", "Telefone"},
            {"INSURANCE", "12.50", "25", "PENDING", "Assurance habitation", "Home insurance", "Hausratversicherung", "Seguro da casa"},
            {"WATER", "24.30", "-6", "PAID", "Eau", "Water", "Wasser", "Água"},
        };
        for (String[] b : bills) {
            Entry e = add(Enums.Module.BILLS, t(l, b[4], b[5], b[6], b[7]));
            e.category = b[0];
            e.amount = new BigDecimal(b[1]);
            e.date = today.plusDays(Long.parseLong(b[2]));
            e.status = b[3];
        }

        String[][] agenda = {
            {"0", "09:00", "Payer la facture de téléphone", "Pay the phone bill", "Telefonrechnung bezahlen", "Pagar a fatura do telefone"},
            {"0", "14:30", "Rendez-vous chez le médecin", "Doctor's appointment", "Arzttermin", "Consulta no médico"},
            {"0", "18:00", "Préparer le dîner", "Prepare dinner", "Abendessen vorbereiten", "Preparar o jantar"},
            {"1", "10:00", "Réunion de travail", "Work meeting", "Arbeitsbesprechung", "Reunião de trabalho"},
            {"1", "15:00", "Visite d'appartement", "Apartment viewing", "Wohnungsbesichtigung", "Visita a apartamento"},
        };
        for (String[] a : agenda) {
            Entry e = add(Enums.Module.AGENDA, t(l, a[2], a[3], a[4], a[5]));
            e.date = today.plusDays(Long.parseLong(a[0]));
            e.time = a[1];
        }

        String[][] docs = {
            {"ADMIN", "1500", "Pièce d'identité", "ID card", "Personalausweis", "Documento de identidade"},
            {"ADMIN", "", "Contrat de travail", "Employment contract", "Arbeitsvertrag", "Contrato de trabalho"},
            {"FINANCE", "", "Quittance de loyer", "Rent receipt", "Mietquittung", "Recibo de renda"},
            {"FINANCE", "250", "Assurance habitation", "Home insurance", "Hausratversicherung", "Seguro da casa"},
            {"FINANCE", "", "Facture d'électricité", "Electricity invoice", "Stromrechnung", "Fatura da eletricidade"},
        };
        for (String[] d : docs) {
            Entry e = add(Enums.Module.DOCUMENTS, t(l, d[2], d[3], d[4], d[5]));
            e.category = d[0];
            if (!d[1].isEmpty()) e.date = today.plusDays(Long.parseLong(d[1]));
        }

        String[][] shop = {
            {"Lait", "Milk", "Milch", "Leite", "1"}, {"Pain", "Bread", "Brot", "Pão", "1"}, {"Œufs", "Eggs", "Eier", "Ovos", "1"},
            {"Tomates", "Tomatoes", "Tomaten", "Tomates", "1"}, {"Salade", "Lettuce", "Salat", "Alface", "0"},
            {"Pâtes", "Pasta", "Nudeln", "Massa", "0"}, {"Poulet", "Chicken", "Hähnchen", "Frango", "0"}, {"Yaourts", "Yoghurt", "Joghurt", "Iogurtes", "0"},
        };
        for (String[] s : shop) {
            Entry e = add(Enums.Module.SHOPPING, t(l, s[0], s[1], s[2], s[3]));
            e.kind = "LIST";
            e.done = "1".equals(s[4]);
        }
        String[][] meals = {
            {"MON", "Salade et poulet", "Salad and chicken", "Salat mit Hähnchen", "Salada e frango"},
            {"TUE", "Pâtes à la bolognaise", "Spaghetti bolognese", "Nudeln Bolognese", "Massa à bolonhesa"},
            {"WED", "Poisson et légumes", "Fish and vegetables", "Fisch mit Gemüse", "Peixe com legumes"},
            {"THU", "Curry de légumes", "Vegetable curry", "Gemüsecurry", "Caril de legumes"},
            {"FRI", "Tarte aux légumes", "Vegetable tart", "Gemüsetarte", "Tarte de legumes"},
        };
        for (String[] m : meals) {
            Entry e = add(Enums.Module.SHOPPING, t(l, m[1], m[2], m[3], m[4]));
            e.kind = "MEAL";
            e.category = m[0];
        }

        String[][] tasks = {
            {"TODO", "0", "Appeler la banque", "Call the bank", "Die Bank anrufen", "Ligar ao banco"},
            {"TODO", "1", "Préparer la déclaration d'impôts", "Prepare the tax return", "Steuererklärung vorbereiten", "Preparar a declaração de impostos"},
            {"TODO", "3", "Organiser un week-end", "Plan a weekend trip", "Wochenendausflug planen", "Organizar um fim de semana"},
            {"DOING", "2", "Sport 3 fois par semaine", "Exercise 3 times a week", "Dreimal pro Woche Sport", "Desporto 3 vezes por semana"},
            {"DONE", "-1", "Lire un livre", "Read a book", "Ein Buch lesen", "Ler um livro"},
        };
        for (String[] k : tasks) {
            Entry e = add(Enums.Module.TASKS, t(l, k[2], k[3], k[4], k[5]));
            e.status = k[0];
            e.date = today.plusDays(Long.parseLong(k[1]));
        }
        return entries.saveAll(out);
    }
}
