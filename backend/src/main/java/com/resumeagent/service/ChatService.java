package com.resumeagent.service;

import com.resumeagent.config.AppConfig;
import com.resumeagent.domain.Conversation;
import com.resumeagent.domain.Message;
import com.resumeagent.domain.OnboardingState;
import com.resumeagent.domain.Resume;
import com.resumeagent.domain.UserProfile;
import com.resumeagent.dto.AiServiceRequest;
import com.resumeagent.dto.AiServiceResponse;
import com.resumeagent.dto.ChatMessageRequest;
import com.resumeagent.dto.ChatMessageResponse;
import com.resumeagent.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Manages chat conversations and routes messages to the AI service.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final FileStorageService storageService;
    private final AiServiceClient aiServiceClient;
    private final AppConfig appConfig;
    private final UserService userService;
    private final ResumeService resumeService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    /**
     * Process a user chat message:
     * 1. Load or create conversation
     * 2. Save user message
     * 3. Build context and forward to AI service
     * 4. Save AI response
     * 5. Return response
     */
    public ChatMessageResponse processMessage(String userId, ChatMessageRequest request) {

        // Load or create conversation
        String conversationId = request.getConversationId();
        Conversation conversation;
        if (conversationId == null || conversationId.isBlank()) {
            conversation = createConversation(userId);
            conversationId = conversation.getConversationId();
        } else {
            conversation = loadConversation(userId, conversationId)
                    .orElseGet(() -> createConversation(userId));
            conversationId = conversation.getConversationId();
        }

        // Create and save user message
        Message userMessage = Message.builder()
                .messageId(UUID.randomUUID().toString())
                .role(Message.Role.USER)
                .content(request.getMessage())
                .timestamp(Instant.now())
                .attachments(request.getAttachments())
                .build();
        conversation.getMessages().add(userMessage);

        // Build context for AI service
        AiServiceRequest aiRequest = buildAiRequest(userId, request.getMessage(), conversation);

        // Call AI service
        AiServiceResponse aiResponse;
        try {
            aiResponse = aiServiceClient.chat(aiRequest).block();
        } catch (Exception e) {
            log.error("Failed to get AI response: {}", e.getMessage());
            aiResponse = AiServiceResponse.builder()
                    .response("I'm sorry, I'm having trouble processing your request. Please try again.")
                    .build();
        }

        // Create and save assistant message
        Message assistantMessage = Message.builder()
                .messageId(UUID.randomUUID().toString())
                .role(Message.Role.ASSISTANT)
                .content(aiResponse.getResponse())
                .timestamp(Instant.now())
                .build();
        conversation.getMessages().add(assistantMessage);

        // Update conversation
        conversation.setUpdatedAt(Instant.now());
        if (conversation.getTitle() == null || "New Chat".equals(conversation.getTitle())) {
            // Auto-generate title from first user message
            String title = request.getMessage().length() > 50
                    ? request.getMessage().substring(0, 50) + "..."
                    : request.getMessage();
            conversation.setTitle(title);
        }
        saveConversation(userId, conversation);

        // Process structured data updates
        if (aiResponse.getData() != null) {
            java.util.Map<String, Object> data = aiResponse.getData();
            try {
                if (data.containsKey("onboardingState")) {
                    OnboardingState state = objectMapper.convertValue(data.get("onboardingState"), OnboardingState.class);
                    userService.saveOnboardingState(userId, state);
                }
                if (data.containsKey("profileUpdate")) {
                    UserProfile profile = userService.getProfile(userId).orElse(new UserProfile());
                    java.util.Map<String, String> updates = (java.util.Map<String, String>) data.get("profileUpdate");
                    updates.forEach((k, v) -> {
                        switch (k) {
                            case "name" -> profile.setName(v);
                            case "email" -> profile.setEmail(v);
                            case "phone" -> profile.setPhone(v);
                            case "location" -> profile.setLocation(v);
                            case "linkedin" -> profile.setLinkedin(v);
                            case "github" -> profile.setGithub(v);
                            case "leetcode" -> profile.setLeetcode(v);
                            case "portfolio" -> profile.setPortfolio(v);
                            case "website" -> profile.setWebsite(v);
                        }
                    });
                    userService.saveProfile(userId, profile);
                    
                    // Sync personal info to master resume immediately so it's never completely empty
                    Resume existingResume = resumeService.getMasterResume(userId).orElse(new Resume());
                    if (existingResume.getPersonalInfo() == null) {
                        existingResume.setPersonalInfo(new Resume.PersonalInfo());
                    }
                    existingResume.getPersonalInfo().setName(profile.getName());
                    existingResume.getPersonalInfo().setEmail(profile.getEmail());
                    existingResume.getPersonalInfo().setPhone(profile.getPhone());
                    existingResume.getPersonalInfo().setLocation(profile.getLocation());
                    existingResume.getPersonalInfo().setLinkedin(profile.getLinkedin());
                    existingResume.getPersonalInfo().setGithub(profile.getGithub());
                    existingResume.getPersonalInfo().setPortfolio(profile.getPortfolio());
                    resumeService.saveMasterResume(userId, existingResume);
                }
                if (data.containsKey("parsedResume")) {
                    Resume parsed = objectMapper.convertValue(data.get("parsedResume"), Resume.class);
                    resumeService.saveMasterResume(userId, parsed);
                }
                if (data.containsKey("enrichmentData")) {
                    // Merge additional experience/projects/skills from the enrichment step
                    Resume existing = resumeService.getMasterResume(userId).orElse(new Resume());
                    java.util.Map<String, Object> enrichment = (java.util.Map<String, Object>) data.get("enrichmentData");
                    try {
                        if (enrichment.containsKey("experience")) {
                            List<Resume.Experience> extra = objectMapper.convertValue(
                                    enrichment.get("experience"),
                                    objectMapper.getTypeFactory().constructCollectionType(List.class, Resume.Experience.class));
                            if (existing.getExperience() == null) {
                                existing.setExperience(new ArrayList<>());
                            }
                            existing.getExperience().addAll(extra);
                        }
                        if (enrichment.containsKey("projects")) {
                            List<Resume.Project> extra = objectMapper.convertValue(
                                    enrichment.get("projects"),
                                    objectMapper.getTypeFactory().constructCollectionType(List.class, Resume.Project.class));
                            if (existing.getProjects() == null) {
                                existing.setProjects(new ArrayList<>());
                            }
                            existing.getProjects().addAll(extra);
                        }
                        if (enrichment.containsKey("skills")) {
                            Resume.Skills extraSkills = objectMapper.convertValue(enrichment.get("skills"), Resume.Skills.class);
                            Resume.Skills current = existing.getSkills() != null ? existing.getSkills() : new Resume.Skills();
                            // Merge each skill category, deduplicating
                            current.setLanguages(mergeSkillList(current.getLanguages(), extraSkills.getLanguages()));
                            current.setFrameworks(mergeSkillList(current.getFrameworks(), extraSkills.getFrameworks()));
                            current.setDatabases(mergeSkillList(current.getDatabases(), extraSkills.getDatabases()));
                            current.setCloud(mergeSkillList(current.getCloud(), extraSkills.getCloud()));
                            current.setTools(mergeSkillList(current.getTools(), extraSkills.getTools()));
                            existing.setSkills(current);
                        }
                        if (enrichment.containsKey("certifications")) {
                            List<String> extra = objectMapper.convertValue(
                                    enrichment.get("certifications"),
                                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
                            if (existing.getCertifications() == null) {
                                existing.setCertifications(new ArrayList<>());
                            }
                            existing.getCertifications().addAll(extra);
                        }
                        if (enrichment.containsKey("achievements")) {
                            List<String> extra = objectMapper.convertValue(
                                    enrichment.get("achievements"),
                                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
                            if (existing.getAchievements() == null) {
                                existing.setAchievements(new ArrayList<>());
                            }
                            existing.getAchievements().addAll(extra);
                        }
                        resumeService.saveMasterResume(userId, existing);
                        log.info("Merged enrichment data into master resume for user: {}", userId);
                    } catch (Exception enrichErr) {
                        log.error("Failed to merge enrichment data: {}", enrichErr.getMessage());
                    }
                }
            } catch (Exception e) {
                log.error("Failed to parse structured data updates: {}", e.getMessage());
            }
        }


        java.util.Map<String, Object> responseData = new java.util.HashMap<>();
        if (aiResponse.getData() != null) {
            responseData.put("data", aiResponse.getData());
        }
        if (aiResponse.getActions() != null) {
            responseData.put("actions", aiResponse.getActions());
        }

        return ChatMessageResponse.builder()
                .conversationId(conversationId)
                .messageId(assistantMessage.getMessageId())
                .content(aiResponse.getResponse())
                .intent(aiResponse.getIntent())
                .command(aiResponse.getCommand())
                .structuredData(responseData.isEmpty() ? null : responseData)
                .build();
    }

    /**
     * Build the AI service request with full context.
     */
    private AiServiceRequest buildAiRequest(String userId, String message, Conversation conversation) {
        // Load user context
        UserProfile profile = storageService.readJson(
                storageService.getProfilePath(userId), UserProfile.class
        ).orElse(null);

        OnboardingState onboardingState = storageService.readJson(
                storageService.getOnboardingStatePath(userId), OnboardingState.class
        ).orElse(OnboardingState.builder().status(OnboardingState.Status.NEW).build());

        Resume masterResume = storageService.readJson(
                storageService.getMasterResumePath(userId), Resume.class
        ).orElse(null);

        // Build conversation history (last 20 messages for context)
        List<AiServiceRequest.MessageDto> history = conversation.getMessages().stream()
                .skip(Math.max(0, conversation.getMessages().size() - 20))
                .map(m -> AiServiceRequest.MessageDto.builder()
                        .role(m.getRole().name().toLowerCase())
                        .content(m.getContent())
                        .build())
                .collect(Collectors.toList());

        return AiServiceRequest.builder()
                .message(message)
                .conversationId(conversation.getConversationId())
                .conversationHistory(history)
                .userProfile(profile)
                .onboardingState(onboardingState)
                .masterResume(masterResume)
                .build();
    }

    /**
     * Create a new conversation.
     */
    public Conversation createConversation(String userId) {
        Conversation conversation = Conversation.builder()
                .conversationId(UUID.randomUUID().toString())
                .title("New Chat")
                .status(Conversation.Status.ACTIVE)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        saveConversation(userId, conversation);
        return conversation;
    }

    /**
     * Load a conversation by ID.
     */
    public Optional<Conversation> loadConversation(String userId, String conversationId) {
        return storageService.readJson(
                storageService.getConversationPath(userId, conversationId),
                Conversation.class
        );
    }

    /**
     * Save a conversation.
     */
    public void saveConversation(String userId, Conversation conversation) {
        storageService.writeJson(
                storageService.getConversationPath(userId, conversation.getConversationId()),
                conversation
        );
    }

    /**
     * List all conversations for a user.
     */
    public List<Conversation> listConversations(String userId) {
        String dir = storageService.getConversationsDir(userId);
        return storageService.listFiles(dir, "conversation_*.json").stream()
                .map(filename -> storageService.readJson(dir + "/" + filename, Conversation.class))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .sorted((a, b) -> b.getUpdatedAt().compareTo(a.getUpdatedAt()))
                .collect(Collectors.toList());
    }

    /**
     * Delete a conversation.
     */
    public boolean deleteConversation(String userId, String conversationId) {
        return storageService.delete(
                storageService.getConversationPath(userId, conversationId)
        );
    }

    /**
     * Merge skills from source into target, deduplicating (case-insensitive).
     */
    private List<String> mergeSkillList(List<String> target, List<String> source) {
        if (target == null) {
            target = new ArrayList<>();
        }
        if (source == null || source.isEmpty()) {
            return target;
        }
        java.util.Set<String> existing = new java.util.TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        existing.addAll(target);
        for (String skill : source) {
            if (skill != null && !skill.isBlank() && !existing.contains(skill.trim())) {
                target.add(skill.trim());
                existing.add(skill.trim());
            }
        }
        return target;
    }
}
