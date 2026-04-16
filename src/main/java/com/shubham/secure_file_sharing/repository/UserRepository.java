package com.shubham.secure_file_sharing.repository;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.shubham.secure_file_sharing.model.User;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}