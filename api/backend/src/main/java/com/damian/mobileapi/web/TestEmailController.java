package com.damian.mobileapi.web;

import com.damian.mobileapi.service.EmailService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestEmailController {

    private final EmailService emailService;

    public TestEmailController(EmailService emailService) {
        this.emailService = emailService;
    }

    @GetMapping("/test-email")
    public String sendTestEmail(@RequestParam String to) {
        emailService.sendSimpleEmail(
                to,
                "Test email from Spring Boot",
                "Hello, this is a test email from your Spring Boot application."
        );

        return "Email sent to Mailpit";
    }
}