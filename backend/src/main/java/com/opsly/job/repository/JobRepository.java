package com.opsly.job.repository;

import com.opsly.job.entity.Job;
import com.opsly.job.entity.JobStatus;
import com.opsly.technician.entity.Technician;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface JobRepository extends JpaRepository<Job, Long> {

    // Technician sees only their own jobs
    Page<Job> findByTechnician(Technician technician, Pageable pageable);

    List<Job> findByTechnicianAndStatus(Technician technician, JobStatus status);

    // Admin/Manager: filter all jobs by status
    Page<Job> findByStatus(JobStatus status, Pageable pageable);

    // Customer: see only their own jobs
    Page<Job> findByCustomerId(Long customerId, Pageable pageable);

    // ---- Dashboard aggregations ----

    long countByStatus(JobStatus status);

    long countByCreatedAtAfter(LocalDateTime since);

    long countByCreatedAtBefore(LocalDateTime before);

    List<Job> findTop4ByOrderByCreatedAtDesc();

    /** Jobs created since the given moment — bucketed per day by the dashboard service */
    @Query("SELECT j FROM Job j WHERE j.createdAt >= :since")
    List<Job> findCreatedSince(@Param("since") LocalDateTime since);

    interface StatusCountRow {
        JobStatus getStatus();

        long getCount();
    }

    @Query("SELECT j.status AS status, COUNT(j) AS count FROM Job j GROUP BY j.status")
    List<StatusCountRow> countGroupedByStatus();

    @Query("SELECT j.customer.id, j.customer.name, COUNT(j) FROM Job j " +
           "GROUP BY j.customer.id, j.customer.name ORDER BY COUNT(j) DESC")
    List<Object[]> countJobsByCustomerTop5();
}
