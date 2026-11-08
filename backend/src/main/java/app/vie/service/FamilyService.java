package app.vie.service;

import app.vie.dto.Dto;
import app.vie.entity.*;
import app.vie.repository.AccessGrantRepository;
import app.vie.repository.FamilyMemberRepository;
import app.vie.repository.FamilyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.*;

@Service
public class FamilyService {
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RND = new SecureRandom();

    private final FamilyRepository families;
    private final FamilyMemberRepository members;
    private final AccessGrantRepository grants;

    public FamilyService(FamilyRepository families, FamilyMemberRepository members, AccessGrantRepository grants) {
        this.families = families;
        this.members = members;
        this.grants = grants;
    }

    private String newCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder("F-");
            for (int i = 0; i < 6; i++) sb.append(ALPHABET.charAt(RND.nextInt(ALPHABET.length())));
            code = sb.toString();
        } while (families.existsByInviteCode(code));
        return code;
    }

    @Transactional
    public Dto.FamilyView create(User user, String name) {
        if (members.findByUserId(user.id).isPresent()) throw Errors.conflict("ERR_ALREADY_IN_FAMILY");
        Family f = new Family();
        f.name = name.trim();
        f.inviteCode = newCode();
        families.save(f);
        FamilyMember m = new FamilyMember();
        m.family = f;
        m.user = user;
        m.role = Enums.FamilyRole.ADMIN;
        members.save(m);
        return view(user);
    }

    @Transactional
    public Dto.FamilyView join(User user, String code) {
        if (members.findByUserId(user.id).isPresent()) throw Errors.conflict("ERR_ALREADY_IN_FAMILY");
        Family f = families.findByInviteCode(code.trim().toUpperCase()).orElseThrow(() -> Errors.notFound("ERR_CODE_UNKNOWN"));
        FamilyMember m = new FamilyMember();
        m.family = f;
        m.user = user;
        members.save(m);
        return view(user);
    }

    /** Vue de la famille de l'utilisateur, ou null s'il n'en a pas. */
    @Transactional(readOnly = true)
    public Dto.FamilyView view(User user) {
        FamilyMember me = members.findByUserId(user.id).orElse(null);
        if (me == null) return null;
        List<Dto.MemberView> ms = new ArrayList<>();
        for (FamilyMember fm : members.findByFamilyIdOrderByIdAsc(me.family.id))
            ms.add(new Dto.MemberView(fm.user.id, fm.user.name, fm.user.email, fm.role.name(),
                    new ArrayList<>(AccessService.parseOffered(fm.offered))));
        List<Dto.GrantView> gs = new ArrayList<>();
        for (AccessGrant g : grants.findByFamilyId(me.family.id))
            gs.add(new Dto.GrantView(g.ownerId, g.granteeId, g.module.name(), g.level.name()));
        return new Dto.FamilyView(me.family.id, me.family.name, me.family.inviteCode, me.role.name(), ms, gs);
    }

    private FamilyMember mine(User user) {
        return members.findByUserId(user.id).orElseThrow(() -> Errors.bad("ERR_NO_FAMILY"));
    }

    private FamilyMember admin(User user) {
        FamilyMember me = mine(user);
        if (me.role != Enums.FamilyRole.ADMIN) throw Errors.forbidden("ERR_ADMIN_ONLY");
        return me;
    }

    /** Chaque membre choisit les menus qu'il accepte de partager. Retirer un menu retire aussi les accès déjà donnés. */
    @Transactional
    public Dto.FamilyView setOffers(User user, List<String> modules) {
        FamilyMember me = mine(user);
        Set<String> clean = new LinkedHashSet<>();
        if (modules != null) for (String m : modules) clean.addAll(AccessService.parseOffered(m));
        me.offered = String.join(",", clean);
        members.save(me);
        for (AccessGrant g : grants.findByFamilyId(me.family.id)) {
            if (g.ownerId.equals(user.id) && g.module != null && !clean.contains(g.module.name())) grants.delete(g);
        }
        return view(user);
    }

    /** L'admin choisit, pour un propriétaire et un bénéficiaire, les menus ouverts et leur niveau. */
    @Transactional
    public Dto.FamilyView setGrants(User user, Long ownerId, Long granteeId, Map<String, String> modules) {
        FamilyMember adm = admin(user);
        if (ownerId.equals(granteeId)) throw Errors.bad("ERR_VALIDATION");
        FamilyMember owner = members.findByUserId(ownerId).orElse(null);
        FamilyMember grantee = members.findByUserId(granteeId).orElse(null);
        if (owner == null || grantee == null || !owner.family.id.equals(adm.family.id) || !grantee.family.id.equals(adm.family.id))
            throw Errors.bad("ERR_NOT_IN_FAMILY");
        Set<String> offered = AccessService.parseOffered(owner.offered);
        grants.deleteByFamilyIdAndOwnerIdAndGranteeId(adm.family.id, ownerId, granteeId);
        grants.flush();
        if (modules != null) {
            for (Map.Entry<String, String> e : modules.entrySet()) {
                if (e.getValue() == null || e.getValue().isBlank()) continue;
                Enums.Module mod;
                Enums.Level level;
                try {
                    mod = Enums.Module.valueOf(e.getKey());
                    level = Enums.Level.valueOf(e.getValue());
                } catch (IllegalArgumentException ex) {
                    throw Errors.bad("ERR_VALIDATION");
                }
                if (!offered.contains(mod.name())) throw Errors.bad("ERR_NOT_OFFERED");
                AccessGrant g = new AccessGrant();
                g.family = adm.family;
                g.ownerId = ownerId;
                g.granteeId = granteeId;
                g.module = mod;
                g.level = level;
                grants.save(g);
            }
        }
        return view(user);
    }

    @Transactional
    public Dto.FamilyView setRole(User user, Long memberUserId, String role) {
        FamilyMember adm = admin(user);
        FamilyMember target = members.findByUserId(memberUserId).orElse(null);
        if (target == null || !target.family.id.equals(adm.family.id)) throw Errors.bad("ERR_NOT_IN_FAMILY");
        Enums.FamilyRole r;
        try {
            r = Enums.FamilyRole.valueOf(role);
        } catch (IllegalArgumentException e) {
            throw Errors.bad("ERR_VALIDATION");
        }
        if (target.user.id.equals(user.id) && r != Enums.FamilyRole.ADMIN) {
            long admins = members.findByFamilyIdOrderByIdAsc(adm.family.id).stream().filter(x -> x.role == Enums.FamilyRole.ADMIN).count();
            if (admins <= 1) throw Errors.bad("ERR_LAST_ADMIN");
        }
        target.role = r;
        members.save(target);
        return view(user);
    }

    /** Un membre quitte la famille, ou l'admin retire un membre. */
    @Transactional
    public Dto.FamilyView remove(User user, Long memberUserId) {
        FamilyMember me = mine(user);
        boolean self = memberUserId.equals(user.id);
        if (!self && me.role != Enums.FamilyRole.ADMIN) throw Errors.forbidden("ERR_ADMIN_ONLY");
        FamilyMember target = members.findByUserId(memberUserId).orElse(null);
        if (target == null || !target.family.id.equals(me.family.id)) throw Errors.bad("ERR_NOT_IN_FAMILY");
        Long familyId = me.family.id;
        grants.deleteByFamilyIdAndOwnerId(familyId, memberUserId);
        grants.deleteByFamilyIdAndGranteeId(familyId, memberUserId);
        members.delete(target);
        members.flush();
        List<FamilyMember> left = members.findByFamilyIdOrderByIdAsc(familyId);
        if (left.isEmpty()) {
            grants.deleteByFamilyId(familyId);
            families.deleteById(familyId);
        } else if (left.stream().noneMatch(x -> x.role == Enums.FamilyRole.ADMIN)) {
            left.get(0).role = Enums.FamilyRole.ADMIN;
            members.save(left.get(0));
        }
        return self ? null : view(user);
    }
}
