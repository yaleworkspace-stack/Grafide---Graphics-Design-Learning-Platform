package com.grafide.controller;

import com.grafide.model.PortfolioItem;
import com.grafide.repository.PortfolioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/portfolio")
@RequiredArgsConstructor
public class PortfolioController {

    private final PortfolioRepository portfolioRepository;

    /** Public — all published items (about page) */
    @GetMapping
    public ResponseEntity<List<PortfolioItem>> getAll(
            @RequestParam(required = false) String category) {

        if (category != null && !category.isBlank()) {
            return ResponseEntity.ok(
                portfolioRepository.findByCategoryAndPublishedTrueOrderByOrderAsc(
                    category.toUpperCase())
            );
        }
        return ResponseEntity.ok(
            portfolioRepository.findByPublishedTrueOrderByOrderAsc()
        );
    }

    /** Public — featured items only */
    @GetMapping("/featured")
    public ResponseEntity<List<PortfolioItem>> getFeatured() {
        return ResponseEntity.ok(
            portfolioRepository.findByFeaturedTrueAndPublishedTrueOrderByOrderAsc()
        );
    }

    /** Admin — all items including unpublished */
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PortfolioItem>> getAllAdmin() {
        return ResponseEntity.ok(portfolioRepository.findAll());
    }

    /** Admin — create */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PortfolioItem> create(@RequestBody PortfolioItem item) {
        item.setCreatedAt(Instant.now());
        item.setUpdatedAt(Instant.now());
        if (item.getCategory() != null) {
            item.setCategory(item.getCategory().toUpperCase());
        }
        return ResponseEntity.ok(portfolioRepository.save(item));
    }

    /** Admin — update */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> update(@PathVariable String id,
                                     @RequestBody PortfolioItem updated) {
        return portfolioRepository.findById(id).map(existing -> {
            updated.setId(id);
            updated.setCreatedAt(existing.getCreatedAt());
            updated.setUpdatedAt(Instant.now());
            if (updated.getCategory() != null) {
                updated.setCategory(updated.getCategory().toUpperCase());
            }
            return ResponseEntity.ok(portfolioRepository.save(updated));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Admin — delete */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable String id) {
        portfolioRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Item deleted."));
    }

    /** Admin — toggle published */
    @PutMapping("/{id}/toggle-publish")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> togglePublish(@PathVariable String id) {
        return portfolioRepository.findById(id).map(item -> {
            item.setPublished(!item.isPublished());
            item.setUpdatedAt(Instant.now());
            return ResponseEntity.ok(portfolioRepository.save(item));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Admin — toggle featured */
    @PutMapping("/{id}/toggle-featured")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> toggleFeatured(@PathVariable String id) {
        return portfolioRepository.findById(id).map(item -> {
            item.setFeatured(!item.isFeatured());
            item.setUpdatedAt(Instant.now());
            return ResponseEntity.ok(portfolioRepository.save(item));
        }).orElse(ResponseEntity.notFound().build());
    }
}
