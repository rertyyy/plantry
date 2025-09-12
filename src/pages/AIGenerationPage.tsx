import { useState, useEffect } from "react";
import { Send, Bot, User, ChefHat, X, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface Recipe {
  id: string;
  name: string;
  calories: number;
  prepTime: string;
  servings: number;
  difficulty: string;
  summary: string;
  ingredients: string[];
  instructions: string[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export default function AIGenerationPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const savedMessages = localStorage.getItem('ai-chat-messages');
    if (savedMessages) {
      const parsed = JSON.parse(savedMessages);
      // Convert timestamp strings back to Date objects
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    }
    return [
      {
        id: '1',
        role: 'ai',
        content: 'Hello! I\'m your AI cooking assistant. I can suggest recipes based on your pantry ingredients. What would you like to cook today?',
        timestamp: new Date()
      }
    ];
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const savedRecipes = localStorage.getItem('ai-recipes');
    return savedRecipes ? JSON.parse(savedRecipes) : [];
  });
  // Pantry preview for UI at bottom of chat
  const [pantryItemsUI, setPantryItemsUI] = useState<Array<{ id: string; name: string; expiration_date: string }>>([]);

  useEffect(() => {
    // Check authentication only (subscription check temporarily disabled)
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    };
    checkAuth();
  }, [navigate]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 1) { // Only save if there are actual messages beyond the initial one
      localStorage.setItem('ai-chat-messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Save recipes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('ai-recipes', JSON.stringify(recipes));
  }, [recipes]);

  // Load pantry items for bottom preview (non-archived pantry only)
  useEffect(() => {
    const fetchPantry = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('groceries')
        .select('id, name, expiration_date')
        .eq('type', 'pantry')
        .eq('archived', false)
        .order('name', { ascending: true });
      if (error) {
        console.error('Failed to load pantry items for UI preview:', error);
        return;
      }
      setPantryItemsUI(data || []);
    };
    fetchPantry();
  }, [user]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Call the edge function to generate recipes
      const { data, error } = await supabase.functions.invoke('generate-recipe', {
        body: {
          userMessage: inputMessage,
        },
      });

      if (error) {
        throw error;
      }

      const { recipes: newRecipes, aiMessage, needsIngredients } = data;

      // Add AI response message
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: aiMessage || 'I\'ve generated some recipe suggestions for you!',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);

      // Update recipes if provided, or clear them if user needs to add ingredients
      if (needsIngredients) {
        setRecipes([]);
        toast({
          title: "No Pantry Items Found",
          description: "Please add ingredients to your pantry in the Groceries tab first.",
          variant: "destructive",
        });
      } else if (newRecipes && Array.isArray(newRecipes) && newRecipes.length > 0) {
        // Validate and normalize each recipe before setting
        const validatedRecipes = newRecipes.map((recipe: any, index: number) => {
          // Defensive validation - ensure all fields exist and are of correct type
          return {
            id: recipe.id || `recipe_${Date.now()}_${index}`,
            name: String(recipe.name || `Recipe ${index + 1}`).substring(0, 40),
            calories: Number(recipe.calories) || 350,
            prepTime: String(recipe.prepTime || recipe.prep_time || '25 min'),
            servings: Number(recipe.servings) || 4,
            difficulty: String(recipe.difficulty || 'Easy'),
            summary: String(recipe.summary || 'Delicious recipe').substring(0, 50),
            ingredients: Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0
              ? recipe.ingredients.filter((ing: any) => ing && typeof ing === 'string')
              : ['No ingredients available'],
            instructions: Array.isArray(recipe.instructions) && recipe.instructions.length > 0
              ? recipe.instructions.filter((inst: any) => inst && typeof inst === 'string')
              : ['No instructions available']
          };
        }).filter((recipe: Recipe) => 
          // Only keep recipes that have meaningful content
          recipe.name && recipe.name !== 'undefined' &&
          recipe.ingredients.length > 0 && 
          recipe.instructions.length > 0
        );

        if (validatedRecipes.length > 0) {
          setRecipes(validatedRecipes);
          toast({
            title: "Recipes Generated",
            description: `${validatedRecipes.length} recipe suggestions are ready!`,
          });
        } else {
          toast({
            title: "Generation Issue",
            description: "Recipes were generated but had formatting issues. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "No Recipes Generated",
          description: "Unable to generate recipes. Please try rephrasing your request.",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Error generating recipes:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: 'Sorry, I encountered an error generating recipes. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: "Error",
        description: "Failed to generate recipes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface-secondary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2 animate-fade-in">
              AI Recipe Generator
            </h1>
            <p className="text-xl text-muted-foreground animate-fade-in">
              Chat with AI to get personalized recipe suggestions from your pantry
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chat Area */}
          <div className="lg:col-span-2">
            <div className="apple-card rounded-2xl overflow-hidden shadow-lg" style={{ height: 'calc(100vh - 280px)' }}>
              <div className="flex flex-col h-full">
                {/* Chat Header */}
                <div className="flex items-center space-x-3 p-6 bg-surface-secondary border-b border-border">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                    <Bot className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      AI Chef Assistant
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Online • Ready to help
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start space-x-3 ${
                        message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user' 
                          ? 'bg-primary' 
                          : 'bg-surface-tertiary'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="w-4 h-4 text-primary-foreground" />
                        ) : (
                          <Bot className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className={`max-w-[80%] p-4 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-md'
                          : 'bg-surface-secondary text-foreground rounded-tl-md'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-2 opacity-70`}>
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-full bg-surface-tertiary flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div className="bg-surface-secondary p-4 rounded-2xl rounded-tl-md">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pantry Items Preview */}
                <div className="px-6 pt-2 bg-surface-secondary border-t border-border">
                  <div className="apple-surface rounded-xl p-3">
                    <div className="text-xs text-muted-foreground mb-2">Your Pantry (non-archived)</div>
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                      {pantryItemsUI.length > 0 ? (
                        pantryItemsUI.map(item => (
                          <span key={item.id} className="px-3 py-1 rounded-full bg-surface-tertiary text-foreground text-xs border border-border">
                            {item.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No pantry items found.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="p-6 border-t border-border bg-surface-secondary">
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me for recipe suggestions..."
                      className="flex-1 apple-input py-3 px-4 text-sm"
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      className="apple-button-primary px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recipe Cards */}
          <div className="lg:col-span-1">
            <div className="apple-card rounded-2xl shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
              <div className="p-6 bg-surface-secondary border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                      <ChefHat className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Recipe Suggestions
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {recipes.length > 0 ? `${recipes.length} AI-generated recipes` : 'AI-generated recipes'}
                      </p>
                    </div>
                  </div>
                  {recipes.length > 0 && (
                    <div className="text-xs text-muted-foreground bg-surface-tertiary px-2 py-1 rounded-full">
                      Scroll for more ↓
                    </div>
                  )}
                </div>
              </div>

              {/* Scrollable Recipe Container */}
              <div className="flex-1 overflow-hidden">
                <div 
                  className="h-full overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border hover:scrollbar-thumb-border/80 px-6 py-4"
                  style={{ maxHeight: 'calc(100vh - 360px)' }}
                >
                  <div className="space-y-4 pb-4">
                    {recipes.length > 0 ? (
                      recipes.map((recipe, index) => (
                        <div
                          key={recipe.id}
                          className="apple-surface p-5 rounded-xl hover:shadow-md transition-all duration-200 group border border-transparent hover:border-primary/20"
                          style={{ 
                            animation: `slideInUp 0.3s ease-out ${index * 0.1}s both` 
                          }}
                        >
                          {/* Recipe Header */}
                          <div className="mb-4">
                            <h4 className="font-semibold text-foreground mb-2 text-lg group-hover:text-primary transition-colors">
                              {recipe.name}
                            </h4>
                            <div className="flex items-center justify-between mb-3">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                                {recipe.calories} cal
                              </span>
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{recipe.prepTime}</span>
                              </div>
                            </div>
                            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                              {recipe.summary}
                            </p>
                            
                            {/* Recipe Preview Stats */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              <div className="text-center p-2 bg-surface-secondary rounded-lg group-hover:bg-surface-tertiary transition-colors">
                                <div className="text-xs text-muted-foreground">Servings</div>
                                <div className="text-sm font-semibold text-foreground">{recipe.servings}</div>
                              </div>
                              <div className="text-center p-2 bg-surface-secondary rounded-lg group-hover:bg-surface-tertiary transition-colors">
                                <div className="text-xs text-muted-foreground">Prep</div>
                                <div className="text-sm font-semibold text-foreground">{recipe.prepTime}</div>
                              </div>
                              <div className="text-center p-2 bg-surface-secondary rounded-lg group-hover:bg-surface-tertiary transition-colors">
                                <div className="text-xs text-muted-foreground">Difficulty</div>
                                <div className="text-sm font-semibold text-foreground">{recipe.difficulty}</div>
                              </div>
                            </div>

                            {/* Ingredient Preview */}
                            <div className="mb-3">
                              <div className="text-xs font-medium text-muted-foreground mb-1">Key Ingredients:</div>
                              <div className="text-xs text-foreground line-clamp-2">
                                {recipe.ingredients.slice(0, 3).map(ingredient => 
                                  ingredient.split(',')[0].split('(')[0].trim()
                                ).join(' • ')}
                                {recipe.ingredients.length > 3 && ' • ...'}
                              </div>
                            </div>
                          </div>

                          {/* View Details Button */}
                          <button 
                            onClick={() => setSelectedRecipe(recipe)}
                            className="w-full py-2.5 px-4 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors group-hover:shadow-md"
                          >
                            View Full Recipe
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <ChefHat className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-foreground mb-2">No recipes yet</h4>
                        <p className="text-muted-foreground text-sm">
                          Ask me for recipe suggestions and they'll appear here!
                        </p>
                        <div className="mt-4 text-xs text-muted-foreground bg-surface-secondary p-3 rounded-lg">
                          💡 Tip: Add items to your pantry in the Groceries page for personalized recipes
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Details Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-surface-tertiary rounded-xl flex items-center justify-center">
                  <ChefHat className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-foreground">
                    {selectedRecipe.name}
                  </h3>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500 text-white">
                      {selectedRecipe.calories} cal
                    </span>
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{selectedRecipe.prepTime}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">{selectedRecipe.servings} servings</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="p-2 hover:bg-surface-secondary rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content - Fully scrollable */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
              <div className="p-6">
                {/* Recipe Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  <div className="text-center p-4 bg-surface-secondary rounded-xl">
                    <div className="text-lg font-bold text-foreground">{selectedRecipe.calories}</div>
                    <div className="text-xs text-muted-foreground">Calories</div>
                  </div>
                  <div className="text-center p-4 bg-surface-secondary rounded-xl">
                    <div className="text-lg font-bold text-foreground">{selectedRecipe.servings}</div>
                    <div className="text-xs text-muted-foreground">Servings</div>
                  </div>
                  <div className="text-center p-4 bg-surface-secondary rounded-xl">
                    <div className="text-lg font-bold text-foreground">{selectedRecipe.prepTime}</div>
                    <div className="text-xs text-muted-foreground">Prep Time</div>
                  </div>
                  <div className="text-center p-4 bg-surface-secondary rounded-xl">
                    <div className="text-lg font-bold text-foreground">{selectedRecipe.difficulty}</div>
                    <div className="text-xs text-muted-foreground">Difficulty</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Ingredients */}
                  <div>
                    <h4 className="text-xl font-semibold text-foreground mb-6 flex items-center">
                      <div className="w-3 h-3 bg-primary rounded-full mr-3"></div>
                      Ingredients ({selectedRecipe.ingredients.length} items)
                    </h4>
                    <div className="space-y-2">
                      {selectedRecipe.ingredients.map((ingredient, index) => (
                        <div
                          key={index}
                          className="flex items-start space-x-4 p-4 bg-surface-secondary rounded-xl hover:bg-surface-tertiary transition-colors"
                        >
                          <div className="flex-shrink-0 w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                            <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>
                          </div>
                          <div className="flex-1">
                            <span className="text-foreground text-sm font-medium leading-relaxed">
                              {ingredient}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div>
                    <h4 className="text-xl font-semibold text-foreground mb-6 flex items-center">
                      <div className="w-3 h-3 bg-primary rounded-full mr-3"></div>
                      Instructions ({selectedRecipe.instructions.length} steps)
                    </h4>
                    <div className="space-y-5">
                      {selectedRecipe.instructions.map((instruction, index) => (
                        <div key={index} className="flex space-x-4 group">
                          <div className="flex-shrink-0 w-9 h-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                            {index + 1}
                          </div>
                          <div className="flex-1 pt-1">
                            <p className="text-foreground text-sm leading-relaxed font-medium">
                              {instruction}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recipe Tips */}
                <div className="mt-8 p-4 bg-surface-secondary rounded-xl">
                  <h5 className="font-semibold text-foreground mb-2 flex items-center">
                    <ChefHat className="w-4 h-4 mr-2 text-primary" />
                    Chef's Tips
                  </h5>
                  <p className="text-muted-foreground text-sm">
                    For best results, read through all instructions before starting. Prep all ingredients first (mise en place) 
                    and ensure your cooking surfaces are clean and ready.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-8 pt-6 border-t border-border pb-8">
                  <button
                    onClick={() => setSelectedRecipe(null)}
                    className="flex-1 px-6 py-3 text-muted-foreground border border-border rounded-lg hover:bg-surface-secondary transition-colors"
                  >
                    Close
                  </button>
                  <button className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold">
                    Start Cooking
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
