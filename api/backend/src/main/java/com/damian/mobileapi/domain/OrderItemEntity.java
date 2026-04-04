package com.damian.mobileapi.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
public class OrderItemEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "order_id")
    private OrderEntity order;

    @ManyToOne(optional = false)
    @JoinColumn(name = "service_id")
    private ServiceEntity service;

    @Column(nullable = false)
    private int qty;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    // getters/setters
    public Long getId() { return id; }
    public OrderEntity getOrder() { return order; }
    public void setOrder(OrderEntity order) { this.order = order; }
    public ServiceEntity getService() { return service; }
    public void setService(ServiceEntity service) { this.service = service; }
    public int getQty() { return qty; }
    public void setQty(int qty) { this.qty = qty; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
}