package app.vie.entity;

public final class Enums {
    private Enums() {}
    public enum Role { USER, ADMIN }
    /** Menus partageables. L'accueil, l'assistant et le profil restent toujours personnels. */
    public enum Module { BUDGET, BILLS, AGENDA, DOCUMENTS, SHOPPING, TASKS }
    /** VIEW = lecture seule, EDIT = lecture et modification. */
    public enum Level { VIEW, EDIT }
    public enum FamilyRole { ADMIN, MEMBER }
}
