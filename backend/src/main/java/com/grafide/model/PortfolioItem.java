package com.grafide.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@Document(collection = "portfolio")
public class PortfolioItem {

    @Id
    private String id;

    private String title;
    private String description;

    /**
     * Category: AGENCY | MAGAZINE | EDITORIAL | STUDENT
     */
    private String category;

    /**
     * Media type: IMAGE | VIDEO
     * VIDEO supports MP4 direct URL, YouTube, or Vimeo
     */
    private String mediaType;

    /** Full URL to the hosted image or video */
    private String mediaUrl;

    /** Optional thumbnail for videos */
    private String thumbnailUrl;

    /** Optional external link — Behance, client site, etc. */
    private String externalLink;

    /** Display order — lower = first */
    private int order = 0;

    private boolean featured   = false;
    private boolean published  = true;

    private Instant createdAt  = Instant.now();
    private Instant updatedAt  = Instant.now();
}
