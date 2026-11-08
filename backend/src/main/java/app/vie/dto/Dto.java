package app.vie.dto;

import app.vie.entity.User;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class Dto {
    private Dto() {}

    /** Le message est un code (ex : ERR_EMAIL_EXISTS) traduit côté site dans la langue de l'utilisateur. */
    public record ErrorResponse(String message, Map<String, String> fields) {}

    public record RegisterRequest(@NotBlank @Size(max = 100) String name, @Email @NotBlank String email,
                                  @Size(min = 8, max = 100) String password, String phone, String lang) {}

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}

    public record AuthResponse(String token, User user) {}

    public record ProfileRequest(@NotBlank @Size(max = 100) String name, String phone, String lang) {}

    public record PasswordRequest(@NotBlank String current, @NotBlank @Size(min = 8, max = 100) String password) {}

    public record EntryRequest(@NotBlank String module, @NotBlank @Size(max = 200) String title, @Size(max = 1000) String note,
                               BigDecimal amount, String kind, String category, LocalDate date, String time,
                               String status, Boolean done, Long ownerId) {}

    public record FamilyCreateRequest(@NotBlank @Size(max = 80) String name) {}

    public record JoinRequest(@NotBlank String code) {}

    public record OffersRequest(List<String> modules) {}

    /** modules : menu → "VIEW" ou "EDIT" ; une valeur vide ou absente retire l'accès. */
    public record GrantRequest(@NotNull Long ownerId, @NotNull Long granteeId, Map<String, String> modules) {}

    public record RoleRequest(@NotBlank String role) {}

    public record MemberView(Long userId, String name, String email, String role, List<String> offered) {}

    public record GrantView(Long ownerId, Long granteeId, String module, String level) {}

    public record FamilyView(Long id, String name, String inviteCode, String myRole, List<MemberView> members,
                             List<GrantView> grants) {}

    /** Un membre dont je peux ouvrir au moins un menu. */
    public record Viewable(Long ownerId, String name, Map<String, String> modules) {}
}
