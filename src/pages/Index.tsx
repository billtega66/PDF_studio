import { useState, useEffect } from "react";
import { Upload, Send, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showRelevant, setShowRelevant] = useState(false);
  const { toast } = useToast();

  const title = "RAG QUESTION ANSWER";

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

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    toast({
      title: "Document processed",
      description: "Your PDF has been processed successfully",
    });
  };

  const handleAsk = async () => {
    if (!question) return;
    // Simulate API call
    toast({
      title: "Processing your question",
      description: "Please wait while we analyze your query",
    });
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
                  disabled={!question}
                >
                  <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  Ask Question
                </button>
              </div>

              <div className="space-y-4">
                <button
                  className="flex items-center justify-between w-full p-4 glass-panel hover:bg-white/[0.04] transition-colors"
                  onClick={() => setShowDocuments(!showDocuments)}
                >
                  <span className="font-medium">Retrieved Documents</span>
                  {showDocuments ? (
                    <ChevronUp className="w-5 h-5 text-primary" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-primary" />
                  )}
                </button>
                {showDocuments && (
                  <div className="p-6 glass-panel space-y-4 animate-fade-in">
                    <p className="text-white/60">No documents retrieved yet.</p>
                  </div>
                )}

                <button
                  className="flex items-center justify-between w-full p-4 glass-panel hover:bg-white/[0.04] transition-colors"
                  onClick={() => setShowRelevant(!showRelevant)}
                >
                  <span className="font-medium">Relevant Document IDs</span>
                  {showRelevant ? (
                    <ChevronUp className="w-5 h-5 text-primary" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-primary" />
                  )}
                </button>
                {showRelevant && (
                  <div className="p-6 glass-panel space-y-4 animate-fade-in">
                    <p className="text-white/60">No relevant documents yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
