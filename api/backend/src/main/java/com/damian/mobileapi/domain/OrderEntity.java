package com.damian.mobileapi.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Entity
@Table(name = "orders")
public class OrderEntity {
    // getters/setters
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Setter
    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Setter
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;

    @Setter
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

}