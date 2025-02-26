
import { useState, useEffect, useCallback, useRef } from "react";
import { Upload, Send, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { debounce } from "@/utils/debounce";

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [retrievedDocuments, setRetrievedDocuments] = useState<any[]>([]);
  const [relevantDocumentIds, setRelevantDocumentIds] = useState<any[]>([]);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [isRelevantOpen, setIsRelevantOpen] = useState(false);
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const previousAnswers = useRef<Map<string, any>>(new Map());
  const { toast } = useToast();

  const title = "RAG.STuDiO";
  const API_URL = "http://127.0.0.1:8001"; // Adjust this if hosted elsewhere

  /** Handle File Selection */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      toast({
        title: "File uploaded successfully",
        description: selectedFile.name,
      });
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
    }
  };

  /** Upload PDF and Process */
  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/process`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          title: "Document Processed",
          description: "Your PDF has been indexed successfully",
        });
      } else {
        toast({
          title: "Error Processing PDF",
          description: data.error || "An error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Unable to connect to the backend.",
        variant: "destructive",
      });
    }

    setIsProcessing(false);
  };

  /** Check if we have a cached answer for this question */
  const getCachedAnswer = (query: string) => {
    const cachedResult = previousAnswers.current.get(query.trim().toLowerCase());
    return cachedResult;
  };

  /** Debounced question handler to reduce API calls */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedQuestionCheck = useCallback(
    debounce((query: string) => {
      // Check if we already have this answer cached
      const cachedResult = getCachedAnswer(query);
      if (cachedResult) {
        // Show a toast to indicate we're using cached results
        toast({
          title: "Retrieved from cache",
          description: "Using previously fetched results",
        });
      }
    }, 500),
    []
  );

  // Update when question changes to check cache
  useEffect(() => {
    if (question.trim().length > 3) {
      debouncedQuestionCheck(question);
    }
  }, [question, debouncedQuestionCheck]);

  /** Ask a Question with Optimistic UI Updates */
  const handleAsk = async () => {
    if (!question) return;
    
    // Reset feedback state when asking a new question
    setFeedback(null);
    setFeedbackComment("");
    setShowFeedbackForm(false);
    
    // Check for cached result first
    const cachedResult = getCachedAnswer(question);
    if (cachedResult) {
      setAnswer(cachedResult.response);
      setRetrievedDocuments(cachedResult.retrieved_documents);
      setRelevantDocumentIds(cachedResult.relevant_ids);
      return;
    }
    
    // If not cached, proceed with API call
    setIsAsking(true);
    
    // Optimistic UI update
    setAnswer("Searching documents for relevant information...");
    
    const formData = new FormData();
    formData.append("prompt", question);

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        // Cache the result for future use
        previousAnswers.current.set(
          question.trim().toLowerCase(), 
          {
            response: data.response, 
            retrieved_documents: data.retrieved_documents,
            relevant_ids: data.relevant_ids
          }
        );
        
        setAnswer(data.response);
        setRetrievedDocuments(data.retrieved_documents);
        setRelevantDocumentIds(data.relevant_ids);

        toast({
          title: "Answer Received",
          description: "Your question has been processed successfully",
        });
      } else {
        setAnswer(null);
        toast({
          title: "Error Getting Answer",
          description: data.error || "An error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setAnswer(null);
      toast({
        title: "Network Error",
        description: "Unable to connect to the backend.",
        variant: "destructive",
      });
    }

    setIsAsking(false);
  };

  /** Handle feedback submission */
  const handleFeedbackSubmit = async () => {
    if (!feedback) return;
    
    try {
      const feedbackData = {
        question,
        answer,
        feedback_type: feedback,
        comment: feedbackComment || "",
        retrieved_documents: retrievedDocuments,
        relevant_document_ids: relevantDocumentIds,
        timestamp: new Date().toISOString()
      };
      
      // In a real implementation, you would send this to your backend
      console.log("Submitting feedback:", feedbackData);
      
      // Example of how to send to your backend
      // await fetch(`${API_URL}/feedback`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(feedbackData),
      // });
      
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
      });
      
      // Reset the feedback form
      setShowFeedbackForm(false);
      
    } catch (error) {
      toast({
        title: "Error Submitting Feedback",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen p-8 animate-fade-in">
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-white/[0.05] shadow-lg">
        <div className="container max-w-5xl mx-auto py-6">
          <h1 className="text-5xl font-black tracking-[-0.02em] text-white">
            {title.split('').map((char, index) => (
              <span key={index} className="animate-letter inline-block">
                {char}
              </span>
            ))}
          </h1>
        </div>
      </div>

      <main className="container max-w-5xl mx-auto pt-24">
        <div className="grid md:grid-cols-[320px,1fr] gap-8">
          <div className="glass-panel p-8 space-y-8 h-fit">
            <div className="space-y-6">
              <h2 className="text-2xl font-medium text-white/90">
                Upload PDF
              </h2>
              <label className="flex flex-col items-center justify-center w-full h-40 glass-panel cursor-pointer hover:bg-white/[0.04] group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 space-y-3">
                  <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm text-white/70">
                    {file ? file.name : "Drop your PDF here or click to browse"}
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf"
                  onChange={handleFileUpload}
                />
              </label>
              <button
                className="glass-button w-full flex items-center justify-center gap-2 group"
                onClick={handleProcess}
                disabled={!file || isProcessing}
              >
                <span className={isProcessing ? "animate-pulse" : ""}>
                  {isProcessing ? "Processing..." : "Process Document"}
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-8">
            <div className="glass-panel p-8 space-y-8">
              <div className="space-y-6">
                <textarea
                  className="glass-input w-full h-40 resize-none"
                  placeholder="Ask a question related to your document..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
                <button
                  className="glass-button w-full flex items-center justify-center gap-3 group"
                  onClick={handleAsk}
                  disabled={!question || isAsking}
                >
                  <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  {isAsking ? "Processing..." : "Ask Question"}
                </button>
              </div>

              {answer && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-6 glass-panel space-y-4">
                    <h3 className="font-medium">Answer:</h3>
                    <p className="text-white/70">{answer}</p>
                  </div>
                  
                  {/* Human Feedback Block */}
                  <div className="p-6 glass-panel space-y-4">
                    <h3 className="font-medium">Was this answer helpful?</h3>
                    <div className="flex items-center gap-4">
                      <button
                        className={`glass-button flex items-center gap-2 ${
                          feedback === "positive" ? "bg-green-500/20 border-green-500/50" : ""
                        }`}
                        onClick={() => {
                          setFeedback("positive");
                          setShowFeedbackForm(true);
                        }}
                      >
                        <ThumbsUp className="w-5 h-5" />
                        Yes
                      </button>
                      <button
                        className={`glass-button flex items-center gap-2 ${
                          feedback === "negative" ? "bg-red-500/20 border-red-500/50" : ""
                        }`}
                        onClick={() => {
                          setFeedback("negative");
                          setShowFeedbackForm(true);
                        }}
                      >
                        <ThumbsDown className="w-5 h-5" />
                        No
                      </button>
                    </div>
                    
                    {showFeedbackForm && (
                      <div className="animate-fade-in space-y-4 pt-4 border-t border-white/10">
                        <textarea
                          className="glass-input w-full h-24 resize-none"
                          placeholder={feedback === "positive" ? "What did you like about this answer?" : "How could this answer be improved?"}
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            className="glass-button flex-1 bg-primary/20 hover:bg-primary/30"
                            onClick={handleFeedbackSubmit}
                          >
                            Submit Feedback
                          </button>
                          <button
                            className="glass-button flex-1"
                            onClick={() => setShowFeedbackForm(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                className="flex items-center justify-between w-full p-4 glass-panel hover:bg-white/[0.04] transition-colors"
                onClick={() => setIsDocumentsOpen(!isDocumentsOpen)}
              >
                <span className="font-medium">Retrieved Documents</span>
                {isDocumentsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {isDocumentsOpen && retrievedDocuments.length > 0 && (
                <div className="p-6 glass-panel space-y-4 animate-fade-in">
                  {retrievedDocuments.map((doc, index) => (
                    <p key={index} className="text-white/60">{doc}</p>
                  ))}
                </div>
              )}

              <button
                className="flex items-center justify-between w-full p-4 glass-panel hover:bg-white/[0.04] transition-colors"
                onClick={() => setIsRelevantOpen(!isRelevantOpen)}
              >
                <span className="font-medium">Relevant Document IDs</span>
                {isRelevantOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {isRelevantOpen && relevantDocumentIds.length > 0 && (
                <div className="p-6 glass-panel space-y-4 animate-fade-in">
                  {relevantDocumentIds.map((id, index) => (
                    <p key={index} className="text-white/60">{id}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
