package app.vie.config;

import org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy;
import org.hibernate.boot.model.naming.Identifier;
import org.hibernate.engine.jdbc.env.spi.JdbcEnvironment;

/** Préfixe toutes les tables par « vie_simplifiee_ » : la base Neon peut être partagée avec d'autres projets. */
public class PrefixNamingStrategy extends CamelCaseToUnderscoresNamingStrategy {
    public static final String PREFIX = "vie_simplifiee_";

    @Override
    public Identifier toPhysicalTableName(Identifier name, JdbcEnvironment context) {
        Identifier base = super.toPhysicalTableName(name, context);
        if (base == null || base.getText().startsWith(PREFIX)) return base;
        return Identifier.toIdentifier(PREFIX + base.getText(), base.isQuoted());
    }
}
