
import { useState } from "react";
import { Upload, Send, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showRelevant, setShowRelevant] = useState(false);
  const { toast } = useToast();

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
    <div className="min-h-screen p-8">
      <main className="container max-w-4xl mx-auto">
        <div className="grid md:grid-cols-[300px,1fr] gap-8">
          {/* Sidebar */}
          <div className="glass-panel p-6 space-y-6 h-fit">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white/90">Upload PDF</h2>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-3 text-white/50" />
                  <p className="text-sm text-white/70">
                    {file ? file.name : "Click to upload PDF"}
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
                className="glass-button w-full flex items-center justify-center gap-2"
                onClick={handleProcess}
                disabled={!file || isProcessing}
              >
                {isProcessing ? "Processing..." : "Process Document"}
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white/90">
              RAG Question Answer
            </h1>
            <div className="glass-panel p-6 space-y-6">
              <div className="space-y-4">
                <textarea
                  className="glass-input w-full h-32 resize-none"
                  placeholder="Ask a question related to your document..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
                <button
                  className="glass-button w-full flex items-center justify-center gap-2"
                  onClick={handleAsk}
                  disabled={!question}
                >
                  <Send className="w-4 h-4" />
                  Ask Question
                </button>
              </div>

              {/* Expandable Sections */}
              <div className="space-y-4">
                <button
                  className="flex items-center justify-between w-full text-white/70 hover:text-white"
                  onClick={() => setShowDocuments(!showDocuments)}
                >
                  <span>Retrieved Documents</span>
                  {showDocuments ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {showDocuments && (
                  <div className="p-4 bg-black/20 rounded-lg">
                    <p className="text-white/60">No documents retrieved yet.</p>
                  </div>
                )}

                <button
                  className="flex items-center justify-between w-full text-white/70 hover:text-white"
                  onClick={() => setShowRelevant(!showRelevant)}
                >
                  <span>Relevant Document IDs</span>
                  {showRelevant ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {showRelevant && (
                  <div className="p-4 bg-black/20 rounded-lg">
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
