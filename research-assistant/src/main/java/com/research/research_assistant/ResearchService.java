package com.research.research_assistant;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Service
public class ResearchService {

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public ResearchService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    public String processContent(ResearchRequest request) {
        // Step 1: Build Prompt
        String prompt = buildPrompt(request);

        // Step 2: Create Gemini API request body
        Map<String, Object> requestBody = Map.of(
                "contents", new Object[]{
                        Map.of("parts", new Object[]{
                                Map.of("text", prompt)
                        })
                }
        );

        try {
            // Step 3: Call Gemini API
            String response = webClient.post()
                    .uri(geminiApiUrl + geminiApiKey)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            // Step 4: Parse and extract text from response
            return extractTextFromResponse(response);

        } catch (Exception e) {
            return "Error during Gemini API call: " + e.getMessage();
        }
    }

    private String extractTextFromResponse(String response) {
        try {
            GeminiResponse geminiResponse = objectMapper.readValue(response, GeminiResponse.class);
            if (geminiResponse.getCandidates() != null && !geminiResponse.getCandidates().isEmpty()) {
                GeminiResponse.Candidate firstCandidate = geminiResponse.getCandidates().get(0);
                if (firstCandidate.getContent() != null &&
                        firstCandidate.getContent().getParts() != null &&
                        !firstCandidate.getContent().getParts().isEmpty()) {
                    return firstCandidate.getContent().getParts().get(0).getText();
                }
            }
            return "No content found in response.";
        } catch (Exception e) {
            return "Error parsing response: " + e.getMessage();
        }
    }

    private String buildPrompt(ResearchRequest request) {
        String operation = request.getOperation();
        String content = request.getContent();
        String language = request.getLanguage();

        StringBuilder prompt = new StringBuilder();

        switch (operation) {
            case "summarize":
                prompt.append("Provide a clear and concise summary of the following in a few sentences:\n\n");
                break;
            case "suggest":
                prompt.append("Based on the following content, suggest related topics and further reading. Use headings and bullet points:\n\n");
                break;
            case "translate":
                if (language == null || language.isEmpty()) {
                    language = "Telugu"; // default
                }
                prompt.append("Translate the following content into ").append(language).append(":\n\n");
                break;
            case "explain":
                prompt.append("Explain the following text in simple terms that a beginner can understand:\n\n");
                break;
            case "rephrase":
                prompt.append("Rephrase the following content to make it more formal and academic:\n\n");
                break;
            case "expand":
                prompt.append("Expand the following content with more detail, examples, and context:\n\n");
                break;
            case "question":
                prompt.append("Generate a list of insightful questions that can be asked based on this content:\n\n");
                break;
            case "keywords":
                prompt.append("Extract the most relevant keywords and key phrases from the following content:\n\n");
                break;
            case "outline":
                prompt.append("Create a structured outline of the following content suitable for a research paper:\n\n");
                break;
            case "tl;dr":
                prompt.append("Give a one-line TL;DR (Too Long; Didn't Read) summary of the following content:\n\n");
                break;
            default:
                throw new IllegalArgumentException("Unknown operation: " + operation);
        }

        prompt.append(content);
        return prompt.toString();
    }
}
