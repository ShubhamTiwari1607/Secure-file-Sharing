package com.shubham.secure_file_sharing.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import com.shubham.secure_file_sharing.service.FileService;
import com.shubham.secure_file_sharing.model.FileEntity;

class FileControllerWebMvcTest {

    private final FileService fileService = Mockito.mock(FileService.class);
    private final FileController controller = new FileController();

    FileControllerWebMvcTest() {
        ReflectionTestUtils.setField(controller, "fileService", fileService);
    }

    @Test
    void uploadReturnsSuccessForAuthenticatedRequest() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "hello.txt",
                "text/plain",
                "hello".getBytes());
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute("email", "user@example.com");
        FileEntity entity = new FileEntity();
        entity.setId(7L);
        entity.setFileName("hello.txt");

        when(fileService.uploadFile(file, "user@example.com"))
                .thenReturn(entity);

        ResponseEntity<Map<String, String>> response = controller.upload(request, file);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("success", response.getBody().get("status"));
        assertEquals("Encrypted file uploaded successfully", response.getBody().get("message"));
        assertEquals("7", response.getBody().get("fileId"));
        assertEquals("hello.txt", response.getBody().get("fileName"));
    }

    @Test
    void uploadReturnsUnauthorizedWhenTokenContextIsMissing() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "hello.txt",
                "text/plain",
                "hello".getBytes());
        MockHttpServletRequest request = new MockHttpServletRequest();

        when(fileService.uploadFile(file, null))
                .thenThrow(new SecurityException("Missing or invalid authentication token"));

        ResponseEntity<Map<String, String>> response = controller.upload(request, file);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals("error", response.getBody().get("status"));
        assertEquals("Missing or invalid authentication token", response.getBody().get("error"));
    }

    @Test
    void listFilesReturnsCurrentUserFiles() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute("email", "user@example.com");

        FileEntity entity = new FileEntity();
        entity.setId(3L);
        entity.setFileName("report.pdf");

        when(fileService.listFiles("user@example.com"))
                .thenReturn(List.of(entity));

        ResponseEntity<List<Map<String, Object>>> response = controller.listFiles(request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
        assertEquals(3L, response.getBody().get(0).get("id"));
        assertEquals("report.pdf", response.getBody().get(0).get("fileName"));
        assertInstanceOf(Map.class, response.getBody().get(0));
    }
}
