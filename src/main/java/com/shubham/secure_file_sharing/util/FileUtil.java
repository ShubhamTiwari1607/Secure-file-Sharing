package com.shubham.secure_file_sharing.util;

public class FileUtil {
    public static String generateFilePath(String filename) {
        return "uploads/" + System.currentTimeMillis() + "_" + filename;
    }
}
