package com.damian.mobileapi.repository;

import com.damian.mobileapi.domain.ServiceEntity;
import org.springframework.data.jpa.repository.JpaRepository;


public interface ServiceRepository extends JpaRepository<ServiceEntity, Long> {}