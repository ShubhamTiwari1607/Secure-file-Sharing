package com.shubham.secure_file_sharing.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.shubham.secure_file_sharing.model.FileEntity;

public interface FileRepository extends JpaRepository<FileEntity, Long> {
    List<FileEntity> findAllByOwnerEmailOrderByIdDesc(String email);
}
