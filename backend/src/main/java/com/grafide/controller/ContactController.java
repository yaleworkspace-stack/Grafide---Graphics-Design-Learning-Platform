package com.grafide.controller;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/contact")
@RequiredArgsConstructor
public class ContactController {

    private static final Logger log = Logger.getLogger(ContactController.class.getName());

    /**
     * POST /api/contact
     * Receives contact form submissions.
     *
     * Currently logs to console and acknowledges.
     * TODO: wire to email service (SendGrid, JavaMail, etc.)
     *       or store in MongoDB contacts collection.
     */
    @PostMapping
    public ResponseEntity<?> submitContact(@RequestBody ContactRequest req) {

        if (req.getName() == null || req.getName().isBlank() ||
            req.getEmail() == null || req.getEmail().isBlank() ||
            req.getMessage() == null || req.getMessage().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Name, email, and message are required."));
        }

        // Log for now — replace with email/DB integration
        log.info(String.format(
            "[CONTACT] %s | From: %s <%s> | Subject: %s | At: %s",
            req.getSubject() != null ? req.getSubject() : "General",
            req.getName(),
            req.getEmail(),
            req.getSubject(),
            Instant.now()
        ));

        /*
         * TO WIRE EMAIL — add dependency to pom.xml:
         *
         * <dependency>
         *   <groupId>org.springframework.boot</groupId>
         *   <artifactId>spring-boot-starter-mail</artifactId>
         * </dependency>
         *
         * Then inject JavaMailSender and send:
         * SimpleMailMessage mail = new SimpleMailMessage();
         * mail.setTo("hello@grafide.com");
         * mail.setSubject("Contact: " + req.getSubject());
         * mail.setText(req.getName() + "\n" + req.getEmail() + "\n\n" + req.getMessage());
         * mailSender.send(mail);
         */

        return ResponseEntity.ok(Map.of(
            "message", "Message received. We'll get back to you shortly."
        ));
    }

    @Data
    public static class ContactRequest {
        private String name;
        private String email;
        private String subject;
        private String message;
    }
}
