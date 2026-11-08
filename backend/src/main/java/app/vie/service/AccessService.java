package app.vie.service;

import app.vie.dto.Dto;
import app.vie.entity.*;
import app.vie.repository.AccessGrantRepository;
import app.vie.repository.FamilyMemberRepository;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Règle d'accès : on voit un menu d'un autre membre seulement si
 * (1) ce membre a accepté de le partager avec la famille ET (2) l'admin de la famille l'a ouvert pour nous.
 */
@Service
public class AccessService {
    private final FamilyMemberRepository members;
    private final AccessGrantRepository grants;

    public AccessService(FamilyMemberRepository members, AccessGrantRepository grants) {
        this.members = members;
        this.grants = grants;
    }

    public static Set<String> parseOffered(String csv) {
        Set<String> out = new LinkedHashSet<>();
        if (csv == null) return out;
        for (String p : csv.split(",")) {
            String t = p.trim();
            if (t.isEmpty()) continue;
            try {
                out.add(Enums.Module.valueOf(t).name());
            } catch (IllegalArgumentException ignored) {
                // menu inconnu : ignoré
            }
        }
        return out;
    }

    /** Menus que « viewer » peut ouvrir chez « ownerId » (menu → niveau). */
    public Map<Enums.Module, Enums.Level> access(User viewer, Long ownerId) {
        Map<Enums.Module, Enums.Level> out = new EnumMap<>(Enums.Module.class);
        if (viewer.id.equals(ownerId)) {
            for (Enums.Module m : Enums.Module.values()) out.put(m, Enums.Level.EDIT);
            return out;
        }
        FamilyMember mine = members.findByUserId(viewer.id).orElse(null);
        FamilyMember theirs = members.findByUserId(ownerId).orElse(null);
        if (mine == null || theirs == null || !mine.family.id.equals(theirs.family.id)) return out;
        Set<String> offered = parseOffered(theirs.offered);
        for (AccessGrant g : grants.findByFamilyIdAndOwnerIdAndGranteeId(mine.family.id, ownerId, viewer.id)) {
            if (g.module == null || !offered.contains(g.module.name())) continue;
            Enums.Level level = g.level == null ? Enums.Level.VIEW : g.level;
            Enums.Level old = out.get(g.module);
            if (old == null || level == Enums.Level.EDIT) out.put(g.module, level);
        }
        return out;
    }

    public void require(User viewer, Long ownerId, Enums.Module module, boolean edit) {
        Enums.Level level = access(viewer, ownerId).get(module);
        if (level == null || (edit && level != Enums.Level.EDIT)) throw Errors.forbidden("ERR_FORBIDDEN");
    }

    /** Les autres membres dont je peux ouvrir au moins un menu. */
    public List<Dto.Viewable> viewables(User viewer) {
        List<Dto.Viewable> out = new ArrayList<>();
        FamilyMember mine = members.findByUserId(viewer.id).orElse(null);
        if (mine == null) return out;
        for (FamilyMember fm : members.findByFamilyIdOrderByIdAsc(mine.family.id)) {
            if (fm.user.id.equals(viewer.id)) continue;
            Map<String, String> mods = new LinkedHashMap<>();
            for (Map.Entry<Enums.Module, Enums.Level> e : access(viewer, fm.user.id).entrySet())
                mods.put(e.getKey().name(), e.getValue().name());
            if (!mods.isEmpty()) out.add(new Dto.Viewable(fm.user.id, fm.user.name, mods));
        }
        return out;
    }
}
