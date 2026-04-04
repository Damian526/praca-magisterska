package com.damian.mobileapi.web;

import com.damian.mobileapi.domain.ServiceEntity;
import com.damian.mobileapi.repository.ServiceRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/services")
public class ServiceController {
    private final ServiceRepository repo;

    public ServiceController(ServiceRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<ServiceEntity> list() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public ServiceEntity get(@PathVariable Long id) {
        return repo.findById(id).orElseThrow();
    }
}