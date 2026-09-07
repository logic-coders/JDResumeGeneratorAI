package com.resumeagent.storage;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.resumeagent.config.AppConfig;
import com.resumeagent.dto.GeneratedResumeItem;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Manages file-based storage for user data.
 * Handles JSON read/write, directory creation, and file listing.
 *
 * Storage structure:
 * storage/users/{userId}/
 *   ├── profile/profile.json
 *   ├── onboarding/onboarding_state.json
 *   ├── master/
 *   │   ├── original_resume.pdf
 *   │   ├── resume_data.json
 *   │   ├── master_resume.tex
 *   │   └── master_resume.pdf
 *   ├── generated/{company}_{title}_{date}/
 *   │   ├── job.json
 *   │   ├── match_report.json
 *   │   ├── resume_data.json
 *   │   ├── resume.tex
 *   │   └── resume.pdf
 *   └── conversations/
 *       └── conversation_{id}.json
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final AppConfig appConfig;
    private final ObjectMapper objectMapper;

    @PostConstruct
    public void init() {
        // Configure ObjectMapper
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        objectMapper.enable(SerializationFeature.INDENT_OUTPUT);
        objectMapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        // Ensure workspace-level Generated Resumes dir exists
        createDirectories(getProjectWorkspaceGeneratedResumesDir());

        // Lazily create per-user directories on first access (see ensureUserDirectories)
        // Also bootstrap the default user so existing single-user setups keep working
        ensureUserDirectories(appConfig.getDefaultUserId());

        log.info("Storage initialized at: {}", appConfig.getStoragePath());
    }

    /**
     * Lazily create per-user storage directories if they don't already exist.
     * Safe to call on every request — only does I/O on the first call per user.
     */
    private final java.util.Set<String> initializedUsers = java.util.concurrent.ConcurrentHashMap.newKeySet();

    public void ensureUserDirectories(String userId) {
        if (initializedUsers.contains(userId)) {
            return; // already created this session
        }
        String userPath = appConfig.getUserStoragePath(userId);
        createDirectories(userPath + "/profile");
        createDirectories(userPath + "/onboarding");
        createDirectories(userPath + "/master");
        createDirectories(userPath + "/generated");
        createDirectories(userPath + "/Generated_Resumes");
        createDirectories(userPath + "/conversations");
        initializedUsers.add(userId);
        log.info("Initialized storage directories for user: {}", userId);
    }

    /**
     * Write an object as JSON to the given file path.
     */
    public <T> void writeJson(String filePath, T data) {
        try {
            Path path = Path.of(filePath);
            createDirectories(path.getParent().toString());
            objectMapper.writeValue(path.toFile(), data);
            log.debug("Written JSON: {}", filePath);
        } catch (IOException e) {
            log.error("Failed to write JSON to {}: {}", filePath, e.getMessage());
            throw new RuntimeException("Failed to write file: " + filePath, e);
        }
    }

    /**
     * Read a JSON file into the given type.
     */
    public <T> Optional<T> readJson(String filePath, Class<T> type) {
        try {
            Path path = Path.of(filePath);
            if (!Files.exists(path)) {
                return Optional.empty();
            }
            T data = objectMapper.readValue(path.toFile(), type);
            return Optional.of(data);
        } catch (IOException e) {
            log.error("Failed to read JSON from {}: {}", filePath, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Write raw bytes to a file (for PDFs, etc.).
     */
    public void writeBytes(String filePath, byte[] data) {
        try {
            Path path = Path.of(filePath);
            createDirectories(path.getParent().toString());
            Files.write(path, data);
            log.debug("Written bytes: {} ({} bytes)", filePath, data.length);
        } catch (IOException e) {
            log.error("Failed to write bytes to {}: {}", filePath, e.getMessage());
            throw new RuntimeException("Failed to write file: " + filePath, e);
        }
    }

    /**
     * Read raw bytes from a file.
     */
    public Optional<byte[]> readBytes(String filePath) {
        try {
            Path path = Path.of(filePath);
            if (!Files.exists(path)) {
                return Optional.empty();
            }
            return Optional.of(Files.readAllBytes(path));
        } catch (IOException e) {
            log.error("Failed to read bytes from {}: {}", filePath, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Write text content to a file (for .tex files, etc.).
     */
    public void writeText(String filePath, String content) {
        try {
            Path path = Path.of(filePath);
            createDirectories(path.getParent().toString());
            Files.writeString(path, content);
            log.debug("Written text: {}", filePath);
        } catch (IOException e) {
            log.error("Failed to write text to {}: {}", filePath, e.getMessage());
            throw new RuntimeException("Failed to write file: " + filePath, e);
        }
    }

    /**
     * Read text content from a file.
     */
    public Optional<String> readText(String filePath) {
        try {
            Path path = Path.of(filePath);
            if (!Files.exists(path)) {
                return Optional.empty();
            }
            return Optional.of(Files.readString(path));
        } catch (IOException e) {
            log.error("Failed to read text from {}: {}", filePath, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Check if a file exists.
     */
    public boolean exists(String filePath) {
        return Files.exists(Path.of(filePath));
    }

    /**
     * List subdirectories in a directory.
     */
    public List<String> listDirectories(String dirPath) {
        try (Stream<Path> stream = Files.list(Path.of(dirPath))) {
            return stream
                    .filter(Files::isDirectory)
                    .map(p -> p.getFileName().toString())
                    .sorted()
                    .collect(Collectors.toList());
        } catch (IOException e) {
            log.error("Failed to list directories in {}: {}", dirPath, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * List files in a directory matching a glob pattern.
     */
    public List<String> listFiles(String dirPath, String glob) {
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(Path.of(dirPath), glob)) {
            return java.util.stream.StreamSupport.stream(stream.spliterator(), false)
                    .map(p -> p.getFileName().toString())
                    .sorted()
                    .collect(Collectors.toList());
        } catch (IOException e) {
            log.error("Failed to list files in {}: {}", dirPath, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Delete a file.
     */
    public boolean delete(String filePath) {
        try {
            return Files.deleteIfExists(Path.of(filePath));
        } catch (IOException e) {
            log.error("Failed to delete {}: {}", filePath, e.getMessage());
            return false;
        }
    }

    /**
     * Create directories recursively.
     */
    public void createDirectories(String dirPath) {
        try {
            Files.createDirectories(Path.of(dirPath));
        } catch (IOException e) {
            log.error("Failed to create directories {}: {}", dirPath, e.getMessage());
            throw new RuntimeException("Failed to create directory: " + dirPath, e);
        }
    }

    // ─── Convenience path builders ─────────────────────────────────────

    public String getProfilePath(String userId) {
        return appConfig.getUserStoragePath(userId) + "/profile/profile.json";
    }

    public String getOnboardingStatePath(String userId) {
        return appConfig.getUserStoragePath(userId) + "/onboarding/onboarding_state.json";
    }

    public String getMasterResumePath(String userId) {
        return appConfig.getUserStoragePath(userId) + "/master/resume_data.json";
    }

    public String getMasterResumeTexPath(String userId) {
        return appConfig.getUserStoragePath(userId) + "/master/master_resume.tex";
    }

    public String getMasterResumePdfPath(String userId) {
        return appConfig.getUserStoragePath(userId) + "/master/master_resume.pdf";
    }

    public String getOriginalResumePath(String userId) {
        return appConfig.getUserStoragePath(userId) + "/master/original_resume.pdf";
    }

    public String getGeneratedResumePath(String userId, String folderName) {
        return appConfig.getUserStoragePath(userId) + "/generated/" + folderName;
    }

    public String getConversationPath(String userId, String conversationId) {
        return appConfig.getUserStoragePath(userId) + "/conversations/conversation_" + conversationId + ".json";
    }

    public String getConversationsDir(String userId) {
        return appConfig.getUserStoragePath(userId) + "/conversations";
    }

    public String getGeneratedDir(String userId) {
        return appConfig.getUserStoragePath(userId) + "/generated";
    }

    public String getUserGeneratedResumesDir(String userId) {
        return appConfig.getUserStoragePath(userId) + "/Generated_Resumes";
    }

    public String getProjectWorkspaceGeneratedResumesDir() {
        try {
            return Path.of("../Generated Resumes").toAbsolutePath().normalize().toString();
        } catch (Exception e) {
            return Path.of("./storage/Generated Resumes").toAbsolutePath().normalize().toString();
        }
    }

    public String sanitizeFolderName(String name) {
        if (name == null || name.isBlank()) {
            return "General";
        }
        String clean = name.replaceAll("[\\\\/:*?\"<>|]", "_")
                .replaceAll("\\s+", "_")
                .replaceAll("_+", "_")
                .trim();
        if (clean.startsWith("_")) clean = clean.substring(1);
        if (clean.endsWith("_")) clean = clean.substring(0, clean.length() - 1);
        return clean.isBlank() ? "General" : clean;
    }

    public void copyFile(String sourcePath, String destPath) {
        try {
            Path src = Path.of(sourcePath);
            if (!Files.exists(src)) {
                return;
            }
            Path dst = Path.of(destPath);
            createDirectories(dst.getParent().toString());
            Files.copy(src, dst, StandardCopyOption.REPLACE_EXISTING);
            log.debug("Copied file from {} to {}", sourcePath, destPath);
        } catch (Exception e) {
            log.error("Failed to copy file from {} to {}: {}", sourcePath, destPath, e.getMessage());
        }
    }

    /**
     * Check if a folder for the given jobId already exists in the user's Generated_Resumes directory.
     * Returns the relative folder path (e.g. "Qualcomm/DDR_tools_446720486356") or null.
     */
    public String findExistingFolderForJob(String userId, String safeJobId) {
        String userGenDir = getUserGeneratedResumesDir(userId);
        Path root = Path.of(userGenDir);
        if (!Files.exists(root)) return null;

        try (Stream<Path> stream = Files.walk(root, 3)) {
            Optional<Path> found = stream
                    .filter(Files::isDirectory)
                    .filter(p -> p.getFileName().toString().endsWith("_" + safeJobId) || p.getFileName().toString().equals(safeJobId))
                    .findFirst();
            if (found.isPresent()) {
                Path relative = root.relativize(found.get());
                return relative.toString();
            }
        } catch (Exception ignored) {}
        return null;
    }

    /**
     * Save generated resume files into the company-wise folder.
     * Updates latest version if the same job ID is regenerated.
     */
    public GeneratedResumeItem saveGeneratedResumePackage(
            String userId,
            String company,
            String jobTitle,
            String jobId,
            String jobUrl,
            Object resume,
            Object jobData,
            String texContent,
            Integer matchScore) {

        String safeCompany = sanitizeFolderName(company);
        String safeTitle = sanitizeFolderName(jobTitle);
        if (safeTitle.length() > 45) {
            safeTitle = safeTitle.substring(0, 45);
        }
        String safeJobId = sanitizeFolderName(jobId);

        String existingRelativeFolder = findExistingFolderForJob(userId, safeJobId);
        String relativeFolder = (existingRelativeFolder != null)
                ? existingRelativeFolder
                : safeCompany + "/" + safeTitle + "_" + safeJobId;

        String userFolder = getUserGeneratedResumesDir(userId) + "/" + relativeFolder;
        String workspaceFolder = getProjectWorkspaceGeneratedResumesDir() + "/" + relativeFolder;

        createDirectories(userFolder);
        createDirectories(workspaceFolder);

        String metaPath = userFolder + "/metadata.json";
        GeneratedResumeItem existing = readJson(metaPath, GeneratedResumeItem.class).orElse(null);

        String now = java.time.Instant.now().toString();
        int version = (existing != null && existing.getVersion() > 0) ? existing.getVersion() + 1 : 1;
        String generatedAt = (existing != null && existing.getGeneratedAt() != null)
                ? existing.getGeneratedAt()
                : now;

        String resumeId = safeCompany + "__" + safeJobId;

        GeneratedResumeItem item = GeneratedResumeItem.builder()
                .resumeId(resumeId)
                .company(company != null && !company.isBlank() ? company : safeCompany)
                .jobTitle(jobTitle != null && !jobTitle.isBlank() ? jobTitle : safeTitle)
                .jobId(safeJobId)
                .jobUrl(jobUrl)
                .folderPath("Generated Resumes/" + relativeFolder)
                .hasPdf(true)
                .hasTex(true)
                .hasJson(true)
                .generatedAt(generatedAt)
                .updatedAt(now)
                .version(version)
                .matchScore(matchScore)
                .build();

        // 1. Write to user storage
        writeJson(userFolder + "/resume.json", resume);
        if (jobData != null) {
            writeJson(userFolder + "/job.json", jobData);
        }
        writeText(userFolder + "/resume.tex", texContent);
        writeJson(userFolder + "/metadata.json", item);

        // 2. Mirror to project workspace root "Generated Resumes"
        writeJson(workspaceFolder + "/resume.json", resume);
        if (jobData != null) {
            writeJson(workspaceFolder + "/job.json", jobData);
        }
        writeText(workspaceFolder + "/resume.tex", texContent);
        writeJson(workspaceFolder + "/metadata.json", item);

        log.info("Saved generated resume (v{}) for company '{}' at: {}", version, safeCompany, relativeFolder);
        return item;
    }

    /**
     * Find generated PDF file path across company-wise and legacy storage.
     */
    public Optional<Path> findPdfPath(String userId, String resumeId) {
        if (resumeId == null || resumeId.isBlank()) {
            return Optional.empty();
        }

        // 1. Check direct company/folder path in user Generated_Resumes
        String userGenDir = getUserGeneratedResumesDir(userId);
        Path directPath = Path.of(userGenDir, resumeId, "resume.pdf");
        if (Files.exists(directPath)) return Optional.of(directPath);

        // 2. Check if resumeId is in "Company__JobId" format
        if (resumeId.contains("__")) {
            String[] parts = resumeId.split("__", 2);
            String comp = parts[0];
            String jId = parts[1];
            Path compDir = Path.of(userGenDir, comp);
            if (Files.exists(compDir) && Files.isDirectory(compDir)) {
                try (Stream<Path> stream = Files.list(compDir)) {
                    Optional<Path> found = stream
                            .filter(Files::isDirectory)
                            .filter(p -> p.getFileName().toString().endsWith("_" + jId) || p.getFileName().toString().contains(jId))
                            .map(p -> p.resolve("resume.pdf"))
                            .filter(Files::exists)
                            .findFirst();
                    if (found.isPresent()) return found;
                } catch (IOException e) {
                    log.error("Error searching company dir: {}", e.getMessage());
                }
            }
        }

        // 3. Recursive search in user Generated_Resumes
        try (Stream<Path> stream = Files.walk(Path.of(userGenDir), 3)) {
            Optional<Path> found = stream
                    .filter(p -> p.getFileName().toString().equals("resume.pdf"))
                    .filter(p -> p.getParent().toString().contains(resumeId) || resumeId.contains(p.getParent().getFileName().toString()))
                    .findFirst();
            if (found.isPresent()) return found;
        } catch (Exception ignored) {}

        // 4. Check workspace root "Generated Resumes"
        String wsGenDir = getProjectWorkspaceGeneratedResumesDir();
        try (Stream<Path> stream = Files.walk(Path.of(wsGenDir), 3)) {
            Optional<Path> found = stream
                    .filter(p -> p.getFileName().toString().equals("resume.pdf"))
                    .filter(p -> p.getParent().toString().contains(resumeId) || resumeId.contains(p.getParent().getFileName().toString()))
                    .findFirst();
            if (found.isPresent()) return found;
        } catch (Exception ignored) {}

        // 5. Legacy path: ./storage/users/{userId}/generated/{resumeId}/resume.pdf
        Path legacyPath = Path.of(getGeneratedDir(userId), resumeId, "resume.pdf");
        if (Files.exists(legacyPath)) {
            return Optional.of(legacyPath);
        }

        return Optional.empty();
    }

    /**
     * Find generated LaTeX (.tex) file path across company-wise and legacy storage.
     */
    public Optional<Path> findTexPath(String userId, String resumeId) {
        Optional<Path> pdfPath = findPdfPath(userId, resumeId);
        if (pdfPath.isPresent()) {
            Path texPath = pdfPath.get().getParent().resolve("resume.tex");
            if (Files.exists(texPath)) {
                return Optional.of(texPath);
            }
        }
        return Optional.empty();
    }

    /**
     * List all generated resumes grouped by company, latest updated first.
     */
    public List<GeneratedResumeItem> listGeneratedResumeItems(String userId) {
        List<GeneratedResumeItem> items = new java.util.ArrayList<>();
        String userGenDir = getUserGeneratedResumesDir(userId);

        // 1. Scan user Generated_Resumes for metadata.json
        Path userGenPath = Path.of(userGenDir);
        if (Files.exists(userGenPath)) {
            try (Stream<Path> stream = Files.walk(userGenPath, 3)) {
                stream.filter(p -> p.getFileName().toString().equals("metadata.json"))
                        .forEach(p -> {
                            readJson(p.toString(), GeneratedResumeItem.class).ifPresent(item -> {
                                boolean hasPdf = Files.exists(p.getParent().resolve("resume.pdf"));
                                boolean hasTex = Files.exists(p.getParent().resolve("resume.tex"));
                                item.setHasPdf(hasPdf);
                                item.setHasTex(hasTex);
                                items.add(item);
                            });
                        });
            } catch (IOException e) {
                log.error("Error scanning Generated_Resumes: {}", e.getMessage());
            }
        }

        // 2. Scan legacy generated dir for any unmigrated resumes
        String legacyDir = getGeneratedDir(userId);
        Path legacyPath = Path.of(legacyDir);
        if (Files.exists(legacyPath)) {
            try (Stream<Path> stream = Files.list(legacyPath)) {
                stream.filter(Files::isDirectory).forEach(p -> {
                    String folderName = p.getFileName().toString();
                    boolean alreadyPresent = items.stream().anyMatch(it -> folderName.equals(it.getResumeId()) || it.getFolderPath().contains(folderName));
                    if (!alreadyPresent && Files.exists(p.resolve("resume.pdf"))) {
                        String updatedAt = "Unknown";
                        try {
                            updatedAt = Files.getLastModifiedTime(p.resolve("resume.pdf")).toInstant().toString();
                        } catch (Exception ignored) {}

                        items.add(GeneratedResumeItem.builder()
                                .resumeId(folderName)
                                .company("General")
                                .jobTitle(folderName.replace("_", " "))
                                .jobId(folderName)
                                .folderPath("generated/" + folderName)
                                .hasPdf(true)
                                .hasTex(Files.exists(p.resolve("resume.tex")))
                                .hasJson(Files.exists(p.resolve("resume.json")))
                                .updatedAt(updatedAt)
                                .generatedAt(updatedAt)
                                .version(1)
                                .build());
                    }
                });
            } catch (IOException e) {
                log.error("Error scanning legacy generated dir: {}", e.getMessage());
            }
        }

        // Sort latest updated first
        items.sort((a, b) -> {
            String tA = a.getUpdatedAt() != null ? a.getUpdatedAt() : "";
            String tB = b.getUpdatedAt() != null ? b.getUpdatedAt() : "";
            return tB.compareTo(tA);
        });

        return items;
    }

    /**
     * Delete a generated resume folder across user storage and workspace root.
     */
    public boolean deleteGeneratedResume(String userId, String resumeId) {
        if (resumeId == null || resumeId.isBlank()) {
            return false;
        }

        boolean deletedAny = false;

        // 1. Check legacy folder ./storage/users/{userId}/generated/{resumeId}
        Path legacyDir = Path.of(getGeneratedDir(userId), resumeId);
        if (Files.exists(legacyDir)) {
            deleteRecursively(legacyDir);
            deletedAny = true;
            log.info("Deleted legacy generated resume folder: {}", legacyDir);
        }

        // 2. Check if findPdfPath locates the resume folder
        Optional<Path> pdfPathOpt = findPdfPath(userId, resumeId);
        if (pdfPathOpt.isPresent()) {
            Path folder = pdfPathOpt.get().getParent();
            if (Files.exists(folder)) {
                String folderName = folder.getFileName().toString();
                Path companyDir = folder.getParent();
                String companyName = companyDir.getFileName().toString();

                deleteRecursively(folder);
                deletedAny = true;
                log.info("Deleted generated resume folder from user storage: {}", folder);

                cleanupIfEmpty(companyDir);

                // Also check and delete workspace root mirror
                Path wsDir = Path.of(getProjectWorkspaceGeneratedResumesDir(), companyName, folderName);
                if (Files.exists(wsDir)) {
                    deleteRecursively(wsDir);
                    log.info("Deleted generated resume folder from workspace root: {}", wsDir);
                    cleanupIfEmpty(wsDir.getParent());
                }
            }
        }

        // 3. Scan user Generated_Resumes and workspace Generated Resumes for any directories matching resumeId
        String rawTarget = resumeId.contains("__") ? resumeId.split("__", 2)[1] : resumeId;
        String cleanTarget = rawTarget.replace("job_", "").trim();
        String userGenDir = getUserGeneratedResumesDir(userId);
        Path userGenPath = Path.of(userGenDir);

        if (Files.exists(userGenPath)) {
            try (Stream<Path> stream = Files.walk(userGenPath, 3)) {
                List<Path> matching = stream.filter(Files::isDirectory)
                        .filter(p -> {
                            String name = p.getFileName().toString();
                            if (name.contains(rawTarget) || rawTarget.contains(name)) return true;
                            if (cleanTarget.length() >= 4 && (name.contains(cleanTarget) || cleanTarget.contains(name))) return true;
                            return false;
                        })
                        .collect(Collectors.toList());

                for (Path p : matching) {
                    if (Files.exists(p)) {
                        Path parent = p.getParent();
                        deleteRecursively(p);
                        deletedAny = true;
                        cleanupIfEmpty(parent);
                    }
                }
            } catch (IOException e) {
                log.error("Error searching userGenPath for deletion: {}", e.getMessage());
            }
        }

        String wsGenDir = getProjectWorkspaceGeneratedResumesDir();
        Path wsGenPath = Path.of(wsGenDir);
        if (Files.exists(wsGenPath)) {
            try (Stream<Path> stream = Files.walk(wsGenPath, 3)) {
                List<Path> matching = stream.filter(Files::isDirectory)
                        .filter(p -> {
                            String name = p.getFileName().toString();
                            if (name.contains(rawTarget) || rawTarget.contains(name)) return true;
                            if (cleanTarget.length() >= 4 && (name.contains(cleanTarget) || cleanTarget.contains(name))) return true;
                            return false;
                        })
                        .collect(Collectors.toList());

                for (Path p : matching) {
                    if (Files.exists(p)) {
                        Path parent = p.getParent();
                        deleteRecursively(p);
                        deletedAny = true;
                        cleanupIfEmpty(parent);
                    }
                }
            } catch (IOException e) {
                log.error("Error searching wsGenPath for deletion: {}", e.getMessage());
            }
        }

        return deletedAny;
    }

    public void deleteRecursively(Path path) {
        if (path == null || !Files.exists(path)) return;
        try {
            if (Files.isDirectory(path)) {
                try (Stream<Path> entries = Files.list(path)) {
                    for (Path entry : entries.collect(Collectors.toList())) {
                        deleteRecursively(entry);
                    }
                }
            }
            Files.deleteIfExists(path);
        } catch (IOException e) {
            log.error("Failed to delete path {}: {}", path, e.getMessage());
        }
    }

    private void cleanupIfEmpty(Path dir) {
        try {
            if (dir != null && Files.exists(dir) && Files.isDirectory(dir)) {
                try (Stream<Path> stream = Files.list(dir)) {
                    if (stream.findAny().isEmpty()) {
                        Files.deleteIfExists(dir);
                        log.info("Cleaned up empty directory: {}", dir);
                    }
                }
            }
        } catch (Exception ignored) {}
    }
}

