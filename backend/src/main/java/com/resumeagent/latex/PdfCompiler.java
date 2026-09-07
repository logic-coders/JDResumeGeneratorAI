package com.resumeagent.latex;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.TimeUnit;

/**
 * Executes pdflatex to compile a .tex file into a .pdf file.
 */
@Slf4j
@Component
public class PdfCompiler {

    /**
     * Compiles the given TeX string into a PDF and saves it to outputFilePath.
     * Uses a per-request temp directory to prevent concurrent compilation collisions.
     * Returns true if successful.
     */
    public boolean compile(String texContent, String outputDirectory, String outputFileName) {
        Path outputDir = Paths.get(outputDirectory);
        Path tempDir = null;
        try {
            if (!Files.exists(outputDir)) {
                Files.createDirectories(outputDir);
            }

            // Create an isolated temp directory for this compilation
            tempDir = Files.createTempDirectory("latex_compile_");
            Path texFilePath = tempDir.resolve(outputFileName + ".tex");
            Files.writeString(texFilePath, texContent);

            // Execute tectonic in the temp directory
            String tectonicCmd = findTectonicExecutable();
            ProcessBuilder pb = new ProcessBuilder(
                    tectonicCmd,
                    outputFileName + ".tex"
            );
            
            pb.directory(tempDir.toFile());
            pb.redirectErrorStream(true);
            
            Process process = pb.start();
            
            // Read output
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }
            
            boolean finished = process.waitFor(30, TimeUnit.SECONDS);
            
            if (!finished) {
                process.destroyForcibly();
                log.error("pdflatex compilation timed out.");
                return false;
            }
            
            int exitCode = process.exitValue();
            if (exitCode != 0) {
                log.error("pdflatex compilation failed with exit code: {}", exitCode);
                log.error("pdflatex output: \n{}", output);
                return false;
            }

            // Copy the compiled PDF from temp dir to the actual output directory
            Path compiledPdf = tempDir.resolve(outputFileName + ".pdf");
            Path targetPdf = outputDir.resolve(outputFileName + ".pdf");
            if (Files.exists(compiledPdf)) {
                Files.copy(compiledPdf, targetPdf, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            }

            // Also write the .tex to the output directory for reference
            Path targetTex = outputDir.resolve(outputFileName + ".tex");
            Files.copy(texFilePath, targetTex, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            
            log.info("PDF compiled successfully to {}/{}.pdf", outputDirectory, outputFileName);
            return true;
            
        } catch (Exception e) {
            log.error("Exception during PDF compilation", e);
            return false;
        } finally {
            // Clean up temp directory
            if (tempDir != null) {
                try {
                    try (var entries = Files.walk(tempDir)) {
                        entries.sorted(java.util.Comparator.reverseOrder())
                                .map(Path::toFile)
                                .forEach(File::delete);
                    }
                } catch (Exception cleanup) {
                    log.warn("Failed to clean up temp dir {}: {}", tempDir, cleanup.getMessage());
                }
            }
        }
    }

    /**
     * Locate the tectonic binary across standard macOS/Linux paths.
     */
    private String findTectonicExecutable() {
        String[] candidatePaths = {
            "/opt/homebrew/bin/tectonic",
            "/usr/local/bin/tectonic",
            "/usr/bin/tectonic"
        };
        for (String path : candidatePaths) {
            if (Files.exists(Path.of(path)) && Files.isExecutable(Path.of(path))) {
                return path;
            }
        }
        return "tectonic";
    }
}
