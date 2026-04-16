package com.shubham.secure_file_sharing.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.shubham.secure_file_sharing.model.User;
import com.shubham.secure_file_sharing.service.AuthService;


@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/signup")
    public String signup(@RequestBody User user) {
        try {
            return authService.signup(user);
        } catch (Exception e) {
            return "Error during signup: " + e.getMessage();
        }
    }

    @PostMapping("/login")
    public String login(@RequestBody User user) {
        try {
            return authService.login(user.getEmail(), user.getPassword());
        } catch (Exception e) {
            return "Error during login: " + e.getMessage();
        }
    }
    @GetMapping("/home")
    public String getMethodName(@RequestParam(required = false) String param) {
        return "server started";
    }
    
}
