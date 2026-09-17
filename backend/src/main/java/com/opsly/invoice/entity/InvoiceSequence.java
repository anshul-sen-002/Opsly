package com.opsly.invoice.entity;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class InvoiceSequence {

    @PersistenceContext
    private EntityManager em;

    public String nextNumber() {
        int year = LocalDate.now().getYear();
        long next = nextVal();
        return String.format("INV-%d-%04d", year, next);
    }

    private long nextVal() {
        Query q = em.createNativeQuery("SELECT nextval('invoice_seq')");
        Number result = (Number) q.getSingleResult();
        return result.longValue();
    }
}
