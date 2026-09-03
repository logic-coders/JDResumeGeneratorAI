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
     * Returns true if successful.
     */
    public boolean compile(String texContent, String outputDirectory, String outputFileName) {
        Path workDir = Paths.get(outputDirectory);
        try {
            if (!Files.exists(workDir)) {
                Files.createDirectories(workDir);
            }

            // Write the .tex file
            Path texFilePath = workDir.resolve(outputFileName + ".tex");
            Files.writeString(texFilePath, texContent);

            // Execute tectonic
            ProcessBuilder pb = new ProcessBuilder(
                    "tectonic",
                    outputFileName + ".tex"
            );
            
            pb.directory(workDir.toFile());
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
            
            log.info("PDF compiled successfully to {}/{}.pdf", outputDirectory, outputFileName);
            
            // Clean up auxiliary files
            Files.deleteIfExists(workDir.resolve(outputFileName + ".aux"));
            Files.deleteIfExists(workDir.resolve(outputFileName + ".log"));
            Files.deleteIfExists(workDir.resolve(outputFileName + ".out"));
            
            return true;
            
        } catch (Exception e) {
            log.error("Exception during PDF compilation", e);
            return false;
        }
    }
}
