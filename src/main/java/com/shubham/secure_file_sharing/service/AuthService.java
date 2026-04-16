package com.shubham.secure_file_sharing.service;

import java.security.KeyPair;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.shubham.secure_file_sharing.model.User;
import com.shubham.secure_file_sharing.repository.UserRepository;
import com.shubham.secure_file_sharing.security.JwtUtil;
import com.shubham.secure_file_sharing.util.RSAUtil;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private JwtUtil jwtUtil;

    
    @Autowired
    private RSAUtil rsaUtil;

    public String signup(User user) throws Exception {

        KeyPair keyPair = rsaUtil.generateKeyPair();

        user.setPublicKey(keyPair.getPublic().getEncoded());
        user.setPrivateKey(keyPair.getPrivate().getEncoded());

        userRepo.save(user);

        return "User Registered with keys";
    }

    public String login(String email, String password) {

        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.getPassword().equals(password)) {
            throw new RuntimeException("Invalid credentials");
        }

        return jwtUtil.generateToken(email);
    }
}
