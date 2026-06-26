package com.grafide.repository;

import com.grafide.model.PortfolioItem;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface PortfolioRepository extends MongoRepository<PortfolioItem, String> {
    List<PortfolioItem> findByPublishedTrueOrderByOrderAsc();
    List<PortfolioItem> findByCategoryAndPublishedTrueOrderByOrderAsc(String category);
    List<PortfolioItem> findByFeaturedTrueAndPublishedTrueOrderByOrderAsc();
}
