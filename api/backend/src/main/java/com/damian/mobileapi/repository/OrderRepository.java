package com.damian.mobileapi.repository;


import com.damian.mobileapi.domain.OrderEntity;
import com.damian.mobileapi.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderRepository extends JpaRepository<OrderEntity, Long> {
    List<OrderEntity> findAllByUserOrderByCreatedAtDesc(User user);
}