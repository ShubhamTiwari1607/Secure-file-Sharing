package com.shubham.secure_file_sharing.service;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.List;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.shubham.secure_file_sharing.model.FileEntity;
import com.shubham.secure_file_sharing.model.User;
import com.shubham.secure_file_sharing.repository.FileRepository;
import com.shubham.secure_file_sharing.repository.UserRepository;
import com.shubham.secure_file_sharing.util.AESUtil;
import com.shubham.secure_file_sharing.util.RSAUtil;

@Service
public class FileService {


    @Autowired
    private FileRepository fileRepo;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private AESUtil aesUtil;

    @Autowired
    private RSAUtil rsaUtil;

    public FileEntity uploadFile(MultipartFile file, String email) throws Exception {
        if (email == null || email.isBlank()) {
            throw new SecurityException("Missing or invalid authentication token");
        }

        // Validate inputs
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new IllegalArgumentException("File must have a valid name");
        }

        // Get user with proper error handling
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + email));

        // 1. Generate AES key
        SecretKey aesKey = aesUtil.generateKey();

        // 2. Encrypt file using streaming to handle large files
        byte[] encryptedData = aesUtil.encrypt(file.getBytes(), aesKey);

        // Generate unique filename to avoid collisions
        String uniqueFilename = UUID.randomUUID() + "_" + originalFilename;
        String filePath = "uploads/" + uniqueFilename;

        // Create uploads directory if it doesn't exist
        Files.createDirectories(Paths.get("uploads"));

        // Write file with CREATE, WRITE options
        Files.write(Paths.get(filePath), encryptedData, 
                StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);

        // 3. Encrypt AES key using RSA
        PublicKey publicKey = KeyFactory.getInstance("RSA")
                .generatePublic(new X509EncodedKeySpec(user.getPublicKey()));

        byte[] encryptedKey = rsaUtil.encryptKey(aesKey, publicKey);

        // 4. Save metadata
        FileEntity entity = new FileEntity();
        entity.setFileName(originalFilename);
        entity.setFilePath(filePath);
        entity.setOwner(user);
        entity.setEncryptedKey(encryptedKey);

        return fileRepo.save(entity);
    }

    public List<FileEntity> listFiles(String email) {
        if (email == null || email.isBlank()) {
            throw new SecurityException("Missing or invalid authentication token");
        }

        userRepo.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + email));

        return fileRepo.findAllByOwnerEmailOrderByIdDesc(email);
    }
    
    public byte[] downloadFile(Long fileId, String email) throws Exception {
        if (email == null || email.isBlank()) {
            throw new SecurityException("Missing or invalid authentication token");
        }

        // Get file with proper error handling
        FileEntity file = fileRepo.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("File not found with id: " + fileId));

        // Get user with proper error handling
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + email));

        // Verify user is the owner of the file
        if (!file.getOwner().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized: User is not the owner of this file");
        }

        try {
            System.out.println("Starting download for file: " + file.getFileName() + " (ID: " + fileId + ")");
            
            // 1. Get private key
            PrivateKey privateKey = KeyFactory.getInstance("RSA")
                    .generatePrivate(new PKCS8EncodedKeySpec(user.getPrivateKey()));
            System.out.println("Private key loaded successfully");

            // 2. Decrypt AES key
            SecretKey aesKey = rsaUtil.decryptKey(file.getEncryptedKey(), privateKey);
            System.out.println("AES key decrypted successfully");

            // 3. Read encrypted file
            byte[] encryptedData = Files.readAllBytes(java.nio.file.Paths.get(file.getFilePath()));
            System.out.println("Encrypted file read successfully: " + encryptedData.length + " bytes");

            // 4. Decrypt file
            byte[] decryptedData = aesUtil.decrypt(encryptedData, aesKey);
            System.out.println("File decrypted successfully: " + decryptedData.length + " bytes");
            
            return decryptedData;
        } catch (Exception e) {
            System.err.println("Error during decryption: " + e.getClass().getName() + " - " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    public FileEntity getFileById(Long fileId, String email) throws Exception {
        if (email == null || email.isBlank()) {
            throw new SecurityException("Missing or invalid authentication token");
        }

        // Get file with proper error handling
        FileEntity file = fileRepo.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("File not found with id: " + fileId));

        // Get user with proper error handling
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + email));

        // Verify user is the owner of the file
        if (!file.getOwner().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized: User is not the owner of this file");
        }

        return file;
    }
}
