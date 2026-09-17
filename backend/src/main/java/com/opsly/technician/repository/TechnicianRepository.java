package com.opsly.technician.repository;

import com.opsly.technician.entity.Technician;
import com.opsly.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TechnicianRepository extends JpaRepository<Technician, Long> {

    // Used to find technician profile from authenticated user
    Optional<Technician> findByUser(User user);
}
