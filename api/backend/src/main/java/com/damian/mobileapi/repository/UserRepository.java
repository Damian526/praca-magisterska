package com.damian.mobileapi.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.damian.mobileapi.domain.User;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}