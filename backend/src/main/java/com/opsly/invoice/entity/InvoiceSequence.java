package com.opsly.invoice.entity;

import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.PersistenceException;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Generates human-readable invoice numbers (INV-YYYY-NNNN) from a Postgres sequence.
 *
 * The sequence is not tied to any entity's @SequenceGenerator, so Hibernate's
 * ddl-auto=update never creates it — the first invoice used to fail with
 * "relation invoice_seq does not exist". This component bootstraps the sequence
 * at startup, keeps it ahead of any existing invoice numbers, and self-heals if
 * the sequence disappears at runtime.
 *
 * DDL/JDBC kaam JdbcTemplate se hota hai (autocommit) kyunki @PostConstruct ke
 * waqt transactional proxy abhi ready nahi hota — wahan @Transactional ignore
 * hota hai aur em.executeUpdate() TransactionRequiredException deta hai.
 */
@Component
@RequiredArgsConstructor
public class InvoiceSequence {

    private final JdbcTemplate jdbcTemplate;

    @PersistenceContext
    private EntityManager em;

    /** ddl-auto=update ke baad (EMF pehle banta hai) sequence ensure karo. */
    @PostConstruct
    public void bootstrap() {
        ensureSequence();
    }

    public String nextNumber() {
        int year = LocalDate.now().getYear();
        long next = nextVal();
        return String.format("INV-%d-%04d", year, next);
    }

    private long nextVal() {
        try {
            return nextValRaw();
        } catch (PersistenceException e) {
            // Sequence vanished at runtime (e.g. database recreated) — rebuild and retry once
            ensureSequence();
            return nextValRaw();
        }
    }

    private long nextValRaw() {
        Query q = em.createNativeQuery("SELECT nextval('invoice_seq')");
        Number result = (Number) q.getSingleResult();
        return result.longValue();
    }

    /**
     * Creates the sequence when missing and aligns it past any existing
     * INV-YYYY-NNNN numbers so the UNIQUE invoice_number constraint never trips.
     * setval(..., max_used + 1, false) makes the NEXT nextval return max_used + 1
     * (or 1 when there are no invoices yet).
     */
    void ensureSequence() {
        jdbcTemplate.execute("CREATE SEQUENCE IF NOT EXISTS invoice_seq");
        jdbcTemplate.queryForObject("""
                SELECT setval('invoice_seq',
                    GREATEST(
                        (SELECT COALESCE(MAX(SUBSTRING(invoice_number FROM '[0-9]+$')::bigint), 0)
                           FROM invoices
                          WHERE invoice_number ~ '^INV-[0-9]{4}-[0-9]+$'),
                        0) + 1,
                    false)
                """, Long.class);
    }
}
