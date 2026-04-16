package com.shubham.secure_file_sharing.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.shubham.secure_file_sharing.model.FileEntity;
import com.shubham.secure_file_sharing.service.FileService;

import jakarta.servlet.http.HttpServletRequest;

@RestController
public class FileController {

    @Autowired
    private FileService fileService;

    @PostMapping({"/files/upload"})
    public ResponseEntity<Map<String, String>> upload(HttpServletRequest request,
            @RequestParam("file") MultipartFile file) {
        String email = (String) request.getAttribute("email");
        Map<String, String> response = new HashMap<>();

        try {
            var savedFile = fileService.uploadFile(file, email);
            response.put("message", "Encrypted file uploaded successfully");
            response.put("status", "success");
            response.put("fileId", String.valueOf(savedFile.getId()));
            response.put("fileName", savedFile.getFileName());
            return ResponseEntity.ok(response);
        } catch (SecurityException e) {
            response.put("error", e.getMessage());
            response.put("status", "error");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        } catch (IllegalArgumentException e) {
            response.put("error", e.getMessage());
            response.put("status", "error");
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("error", "File upload failed: " + e.getMessage());
            response.put("status", "error");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/files")
    public ResponseEntity<List<Map<String, Object>>> listFiles(HttpServletRequest request) {
        String email = (String) request.getAttribute("email");

        try {
            List<Map<String, Object>> files = fileService.listFiles(email).stream()
                    .map(file -> {
                        Map<String, Object> entry = new HashMap<>();
                        entry.put("id", file.getId());
                        entry.put("fileName", file.getFileName());
                        return entry;
                    })
                    .toList();

            return ResponseEntity.ok(files);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/files/{id}")
    public ResponseEntity<byte[]> download(HttpServletRequest request,
            @PathVariable Long id) throws Exception {

        String email = (String) request.getAttribute("email");

        try {
            if (email == null || email.isBlank()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            byte[] data = fileService.downloadFile(id, email);
            
            if (data == null || data.length == 0) {
                return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
            }

            // Get the file entity to retrieve the original filename
            var fileEntity = fileService.getFileById(id, email);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=\"" + fileEntity.getFileName() + "\"")
                    .header(HttpHeaders.CONTENT_TYPE, "application/octet-stream")
                    .header("X-File-Size", String.valueOf(data.length))
                    .body(data);
        } catch (SecurityException e) {
            System.err.println("Security Exception in download: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (IllegalArgumentException e) {
            System.err.println("Illegal Argument Exception in download: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            System.err.println("Exception in download: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/files/{id}/diagnose")
    public ResponseEntity<Map<String, Object>> diagnoseDownload(HttpServletRequest request,
            @PathVariable Long id) throws Exception {
        String email = (String) request.getAttribute("email");
        Map<String, Object> response = new HashMap<>();

        try {
            if (email == null || email.isBlank()) {
                response.put("status", "error");
                response.put("message", "Missing authentication");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            FileEntity fileEntity = fileService.getFileById(id, email);
            byte[] decryptedData = fileService.downloadFile(id, email);

            response.put("status", "success");
            response.put("fileId", fileEntity.getId());
            response.put("fileName", fileEntity.getFileName());
            response.put("filePath", fileEntity.getFilePath());
            response.put("encryptedKeySize", fileEntity.getEncryptedKey() != null ? fileEntity.getEncryptedKey().length : 0);
            response.put("decryptedDataSize", decryptedData != null ? decryptedData.length : 0);
            response.put("ownerId", fileEntity.getOwner().getId());
            response.put("ownerEmail", fileEntity.getOwner().getEmail());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
