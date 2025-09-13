import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Plus, Calendar, DollarSign, Package, Edit, Archive, X, Save, AlertTriangle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useProfile } from "@/contexts/ProfileContext";
import { useConfetti } from "@/hooks/useConfetti";

interface GroceryItem {
  id: string;
  name: string;
  cost: number;
  quantity: number;
  expiration_date: string;
  type: 'grocery' | 'pantry';
  user_id: string;
  added_by_profile_id?: string;
  archived: boolean;
  created_at?: string;
  updated_at?: string;
}

interface GroceryDragDropProps {
  user: User;
}

interface Profile {
  id: string;
  name: string;
  color: string;
}

export default function GroceryDragDrop({ user }: GroceryDragDropProps) {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [allItems, setAllItems] = useState<GroceryItem[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<{ show: boolean; item: GroceryItem | null }>({ show: false, item: null });
  const [expirationConfirm, setExpirationConfirm] = useState<{ show: boolean; dontRemindAgain: boolean }>({ show: false, dontRemindAgain: false });
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<GroceryItem[]>([]);
  const { toast } = useToast();
  const { selectedProfile } = useProfile();
  const { triggerConfetti } = useConfetti();

  const [newItem, setNewItem] = useState({
    name: '',
    cost: '',
    quantity: '1',
    expiration_date: '',
    type: 'grocery' as 'grocery' | 'pantry'
  });

  const [editForm, setEditForm] = useState({
    name: '',
    cost: '',
    quantity: '1',
    expiration_date: ''
  });

  useEffect(() => {
    if (user) {
      fetchGroceries();
      fetchAllItems();
      fetchProfiles();
    }
  }, [user]);

  const fetchAllItems = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('groceries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllItems((data || []) as GroceryItem[]);
    } catch (error: any) {
      console.error('Failed to fetch all items:', error.message);
    }
  };

  const fetchProfiles = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, color')
        .eq('user_id', user.id);

      if (error) throw error;
      setProfiles((data || []) as Profile[]);
    } catch (error: any) {
      console.error('Failed to fetch profiles:', error.message);
    }
  };

  const fetchGroceries = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('groceries')
        .select('*, profiles:added_by_profile_id(id, name, color)')
        .eq('user_id', user.id)
        .eq('archived', false) // Only fetch non-archived items
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data || []) as GroceryItem[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch groceries: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    // Check if a profile is selected
    if (!selectedProfile) {
      toast({
        title: "No Profile Selected",
        description: "Please select a profile from the profile selector first.",
        variant: "destructive",
      });
      return;
    }

    // Basic validation - name and cost are required
    const isValid = newItem.name && newItem.cost;
    
    if (!isValid) {
      toast({
        title: "Missing Information",
        description: "Please fill in item name and cost.",
        variant: "destructive",
      });
      return;
    }

    // Check if pantry item has no expiration date and show confirmation
    if (newItem.type === 'pantry' && !newItem.expiration_date) {
      const dontRemind = localStorage.getItem('grocery-no-expiration-reminder') === 'true';
      if (!dontRemind) {
        setExpirationConfirm({ show: true, dontRemindAgain: false });
        return;
      }
    }

    await addItemToDatabase();
  };

  const addItemToDatabase = async () => {
    if (user) {
      try {
        // If no expiration date, set a far future date for both types
        const expirationDate = newItem.expiration_date || 
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('groceries')
          .insert([
            {
              name: newItem.name,
              cost: parseFloat(newItem.cost),
              quantity: parseInt(newItem.quantity),
              expiration_date: expirationDate,
              type: newItem.type,
              user_id: user.id,
              added_by_profile_id: selectedProfile.id
            }
          ])
          .select('*, profiles:added_by_profile_id(id, name, color)')
          .single();

        if (error) throw error;

        setItems([data as GroceryItem, ...items]);
        setAllItems([data as GroceryItem, ...allItems]); // Also add to allItems for autocomplete
        setNewItem({ name: '', cost: '', quantity: '1', expiration_date: '', type: 'grocery' });
        
        // Trigger confetti if fun mode is enabled
        triggerConfetti();
        
        toast({
          title: "Item added",
          description: `${newItem.name} has been added to your ${newItem.type}.`,
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to add item: " + error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleExpirationConfirm = () => {
    if (expirationConfirm.dontRemindAgain) {
      localStorage.setItem('grocery-no-expiration-reminder', 'true');
    }
    setExpirationConfirm({ show: false, dontRemindAgain: false });
    addItemToDatabase();
  };

  const cancelExpirationConfirm = () => {
    setExpirationConfirm({ show: false, dontRemindAgain: false });
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    // If dropped in the same place, do nothing
    if (source.droppableId === destination.droppableId) return;

    const newType = destination.droppableId as 'grocery' | 'pantry';
    
    try {
      const { error } = await supabase
        .from('groceries')
        .update({ type: newType })
        .eq('id', draggableId);

      if (error) throw error;

      // Update local state
      setItems(items.map(item => 
        item.id === draggableId 
          ? { ...item, type: newType }
          : item
      ));

      toast({
        title: "Item moved",
        description: `Item moved to ${newType === 'grocery' ? 'grocery list' : 'pantry'}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to move item: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleArchiveItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('groceries')
        .update({ archived: true })
        .eq('id', itemId);

      if (error) throw error;

      // Remove from local state
      setItems(items.filter(item => item.id !== itemId));
      setArchiveConfirm({ show: false, item: null });

      toast({
        title: "Item archived",
        description: "Item has been archived and removed from the list.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to archive item: " + error.message,
        variant: "destructive",
      });
    }
  };

  const showArchiveConfirm = (item: GroceryItem) => {
    setArchiveConfirm({ show: true, item });
  };

  const cancelArchive = () => {
    setArchiveConfirm({ show: false, item: null });
  };

  const handleEditItem = (item: GroceryItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      cost: item.cost.toString(),
      quantity: item.quantity.toString(),
      expiration_date: item.expiration_date
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('groceries')
        .update({
          name: editForm.name,
          cost: parseFloat(editForm.cost),
          quantity: parseInt(editForm.quantity),
          expiration_date: editForm.expiration_date
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      // Update local state
      setItems(items.map(item =>
        item.id === editingItem.id
          ? {
              ...item,
              name: editForm.name,
              cost: parseFloat(editForm.cost),
              quantity: parseInt(editForm.quantity),
              expiration_date: editForm.expiration_date
            }
          : item
      ));

      setEditingItem(null);
      setEditForm({ name: '', cost: '', quantity: '1', expiration_date: '' });

      toast({
        title: "Item updated",
        description: "Item details have been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update item: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async () => {
  if (!editingItem) return;

  try {
    // Delete the grocery item
    const { error: groceryError } = await supabase
      .from('groceries')
      .delete()
      .eq('id', editingItem.id);

    if (groceryError) throw groceryError;

    // Also delete related weekly_expenses (adjust filters if needed)
    const { error: weeklyError } = await supabase
      .from('weekly_expenses')
      .delete()
      .eq('user_id', user.id)
      .gte('week_start', editingItem.expiration_date)
      .lte('week_end', editingItem.expiration_date);

    if (weeklyError) throw weeklyError;

    // Update local state
    setItems(items.filter(item => item.id !== editingItem.id));
    setAllItems(allItems.filter(item => item.id !== editingItem.id));

    setEditingItem(null);
    setEditForm({ name: '', cost: '', quantity: '1', expiration_date: '' });

    toast({
      title: "Item deleted",
      description: `${editingItem.name} has been permanently deleted (including weekly expenses).`,
    });
  } catch (error: any) {
    toast({
      title: "Error",
      description: "Failed to delete item: " + error.message,
      variant: "destructive",
    });
  }
};
  
  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditForm({ name: '', cost: '', quantity: '1', expiration_date: '' });
  };

  const getProfilePill = (item: GroceryItem) => {
    if (!item.added_by_profile_id) return null;
    
    const profile = profiles.find(p => p.id === item.added_by_profile_id);
    if (!profile) return null;

    const initials = profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    
    return (
      <div 
        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: profile.color }}
      >
        {initials}
      </div>
    );
  };

  const handleNameInputChange = (value: string) => {
    setNewItem({ ...newItem, name: value });
    
    if (value.trim().length > 0) {
      // Filter past items by name matching at start of words only (case insensitive)
      const suggestions = allItems.filter(item => {
        const itemName = item.name.toLowerCase();
        const searchValue = value.toLowerCase();
        
        // Check if the search value matches the start of the entire name
        if (itemName.startsWith(searchValue)) {
          return true;
        }
        
        // Check if the search value matches the start of any word in the name
        const words = itemName.split(/\s+/);
        return words.some(word => word.startsWith(searchValue));
      }).filter(item => 
        item.name.toLowerCase() !== value.toLowerCase() // Don't show exact matches
      );
      
      // Remove duplicates by name and get the most recent entry for each
      const uniqueSuggestions = suggestions.reduce((acc: GroceryItem[], current) => {
        const existing = acc.find(item => item.name.toLowerCase() === current.name.toLowerCase());
        if (!existing) {
          acc.push(current);
        }
        return acc;
      }, []);
      
      if (uniqueSuggestions.length > 0) {
        setAutocompleteSuggestions(uniqueSuggestions.slice(0, 5)); // Show max 5 suggestions
        setShowAutocomplete(true);
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  };

  const handleAutocompleteSelect = (suggestion: GroceryItem) => {
    setNewItem({
      name: suggestion.name,
      cost: suggestion.cost.toString(),
      quantity: suggestion.quantity.toString(),
      expiration_date: '', // Always leave blank as requested
      type: 'grocery' // Always set to grocery as requested
    });
    setShowAutocomplete(false);
  };

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAutocomplete && !(event.target as Element)?.closest('.autocomplete-container')) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showAutocomplete]);

  const groceryItems = items.filter(item => item.type === 'grocery');
  const pantryItems = items.filter(item => item.type === 'pantry');

  const GroceryItemCard = ({ item, index }: { item: GroceryItem; index: number }) => {
    // Grocery items don't have expiration dates
    const highlightClass = '';
    const borderClass = '';
    const statusText = '';
    const statusIcon = null;
    const daysDifference = 0;
    
    return (
      <Draggable draggableId={item.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`relative p-3 rounded-lg transition-all duration-200 ${highlightClass} ${borderClass || 'apple-card'} ${
              snapshot.isDragging 
                ? 'shadow-lg rotate-1 scale-105' 
                : 'hover:shadow-md'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground text-sm">{item.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-primary">
                        ${(item.cost * item.quantity).toFixed(2)}
                        {item.quantity > 1 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (${item.cost.toFixed(2)} each)
                          </span>
                        )}
                      </span>
                      {item.quantity > 1 && (
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full font-medium">
                          x{item.quantity}
                        </span>
                      )}
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditItem(item);
                        }}
                        className="w-6 h-6 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showArchiveConfirm(item);
                        }}
                        className="w-6 h-6 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary-hover transition-colors flex items-center justify-center"
                      >
                        <Archive className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.expiration_date).toLocaleDateString()}
                    </span>
                    {statusText && (
                      <span className={`text-xs font-medium ml-2 flex items-center gap-1 ${
                        daysDifference < 0 ? 'text-destructive' : 'text-warning'
                      }`}>
                        {statusIcon}
                        {statusText}
                      </span>
                    )}
                  </div>
                  {getProfilePill(item)}
                </div>
               </div>
             </div>
           </div>
         )}
       </Draggable>
     );
   };

  const PantryItemCard = ({ item, index }: { item: GroceryItem; index: number }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if expiration_date exists
    let daysDifference = 0;
    if (item.expiration_date) {
      const expirationDate = new Date(item.expiration_date);
      expirationDate.setHours(0, 0, 0, 0);
      daysDifference = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    let highlightClass = '';
    let borderClass = '';
    let statusText = '';
    let statusIcon = null;
    
    if (daysDifference < 0) {
      highlightClass = 'bg-destructive/10 dark:bg-destructive/20';
      borderClass = 'border-2 border-destructive/50';
      statusText = 'Expired';
      statusIcon = <AlertTriangle className="w-3 h-3" />;
    } else if (daysDifference <= 3) {
      highlightClass = 'bg-warning/10 dark:bg-warning/20';
      borderClass = 'border-2 border-warning/50';
      statusText = `Expires in ${daysDifference} day${daysDifference > 1 ? 's' : ''}`;
      statusIcon = <AlertTriangle className="w-3 h-3" />;
    }
    
    return (
      <Draggable draggableId={item.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`relative p-3 rounded-lg transition-all duration-200 ${highlightClass} ${borderClass || 'apple-card'} ${
              snapshot.isDragging 
                ? 'shadow-lg rotate-1 scale-105' 
                : 'hover:shadow-md'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground text-sm">{item.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-primary">
                        ${(item.cost * item.quantity).toFixed(2)}
                        {item.quantity > 1 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (${item.cost.toFixed(2)} each)
                          </span>
                        )}
                      </span>
                      {item.quantity > 1 && (
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full font-medium">
                          x{item.quantity}
                        </span>
                      )}
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditItem(item);
                        }}
                        className="w-6 h-6 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showArchiveConfirm(item);
                        }}
                        className="w-6 h-6 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary-hover transition-colors flex items-center justify-center"
                      >
                        <Archive className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.expiration_date).toLocaleDateString()}
                    </span>
                    {statusText && (
                      <span className={`text-xs font-medium ml-2 flex items-center gap-1 ${
                        daysDifference < 0 ? 'text-destructive' : 'text-warning'
                      }`}>
                        {statusIcon}
                        {statusText}
                      </span>
                    )}
                  </div>
                  {getProfilePill(item)}
                 </div>
               </div>
             </div>
           </div>
         )}
       </Draggable>
     );
   };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Groceries & Pantry
          </h1>
          <p className="text-xl text-muted-foreground">
            Drag items between grocery list and pantry to track your weekly expenses
          </p>
        </div>

        {/* Add Item Form */}
        <div className="apple-card p-6 rounded-2xl mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Add New Item</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Item Name
              </label>
              <div className="relative autocomplete-container">
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => handleNameInputChange(e.target.value)}
                  className="apple-input w-full"
                  placeholder="Enter item name"
                />
                
                {showAutocomplete && autocompleteSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {autocompleteSuggestions.map((suggestion, index) => (
                      <button
                        key={`${suggestion.id}-${index}`}
                        onClick={() => handleAutocompleteSelect(suggestion)}
                        className="w-full text-left px-4 py-3 hover:bg-surface-secondary transition-colors border-b border-border/50 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">{suggestion.name}</span>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span>${suggestion.cost.toFixed(2)}</span>
                            <span>×{suggestion.quantity}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={newItem.cost}
                onChange={(e) => setNewItem({ ...newItem, cost: e.target.value })}
                className="apple-input w-full"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                className="apple-input w-full"
                placeholder="1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Expiration Date (Optional)
              </label>
              <input
                type="date"
                value={newItem.expiration_date}
                onChange={(e) => setNewItem({ ...newItem, expiration_date: e.target.value })}
                className="apple-input w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Type
              </label>
              <select
                value={newItem.type}
                onChange={(e) => setNewItem({ ...newItem, type: e.target.value as 'grocery' | 'pantry' })}
                className="apple-input w-full"
              >
                <option value="grocery">Grocery</option>
                <option value="pantry">Pantry</option>
              </select>
            </div>
          </div>
          
          {/* Add Item Button with Profile Indicator */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleAddItem}
              disabled={!selectedProfile}
              className="apple-button-primary px-6 py-2.5 rounded-lg font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
            
            {selectedProfile && (
              <div className="flex items-center space-x-3 bg-surface-secondary rounded-lg px-4 py-2.5 border border-border">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: selectedProfile.color }}
                >
                  {selectedProfile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Adding as: {selectedProfile.name}</p>
                  <p className="text-xs text-muted-foreground">Items will be attributed to this profile</p>
                </div>
              </div>
            )}
            
            {!selectedProfile && (
              <div className="flex items-center space-x-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg px-4 py-2.5 border border-yellow-200 dark:border-yellow-800">
                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ No profile selected
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Expiration Summary */}
        {(() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const expiredItems = pantryItems.filter(item => {
            if (!item.expiration_date) return false;
            const expirationDate = new Date(item.expiration_date);
            expirationDate.setHours(0, 0, 0, 0);
            return expirationDate < today;
          });
          
          const expiringSoonItems = pantryItems.filter(item => {
            if (!item.expiration_date) return false;
            const expirationDate = new Date(item.expiration_date);
            expirationDate.setHours(0, 0, 0, 0);
            const daysDifference = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return daysDifference >= 0 && daysDifference <= 3;
          });
          
          if (expiredItems.length > 0 || expiringSoonItems.length > 0) {
            return (
              <div className="mb-6 space-y-3">
                {expiredItems.length > 0 && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                    <div>
                      <p className="font-medium text-destructive">
                        {expiredItems.length} item{expiredItems.length > 1 ? 's' : ''} expired
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {expiredItems.slice(0, 3).map(item => item.name).join(', ')}
                        {expiredItems.length > 3 && ` and ${expiredItems.length - 3} more`}
                      </p>
                    </div>
                  </div>
                )}
                
                {expiringSoonItems.length > 0 && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                    <div>
                      <p className="font-medium text-warning">
                        {expiringSoonItems.length} item{expiringSoonItems.length > 1 ? 's' : ''} expiring soon
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {expiringSoonItems.slice(0, 3).map(item => item.name).join(', ')}
                        {expiringSoonItems.length > 3 && ` and ${expiringSoonItems.length - 3} more`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          }
          return null;
        })()}

        {/* Drag & Drop Lists */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Groceries */}
            <div className="apple-card p-6 rounded-2xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-surface-tertiary rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">
                    Groceries
                  </h2>
                  <p className="text-muted-foreground">
                  {groceryItems
                    .filter(item => item.type === "grocery")
                    .reduce((total, item) => total + item.quantity, 0)} items • Drag to move to pantry
                </p>
                </div>
              </div>
              
              <Droppable droppableId="grocery">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-3 min-h-[200px] p-4 rounded-lg transition-colors ${
                      snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    {groceryItems.length > 0 ? (
                      groceryItems.map((item, index) => (
                        <GroceryItemCard key={item.id} item={item} index={index} />
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No grocery items yet</p>
                        <p className="text-sm">Items will appear here when added</p>
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Pantry */}
            <div className="apple-card p-6 rounded-2xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-surface-tertiary rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">
                    Pantry Items
                  </h2>
                  <p className="text-muted-foreground">
            {pantryItems.reduce((total, item) => total + item.quantity, 0)} items • Weekly expenses tracked
                  </p>
                </div>
              </div>
              
              <Droppable droppableId="pantry">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-3 min-h-[200px] p-4 rounded-lg transition-colors ${
                      snapshot.isDraggingOver ? 'bg-green-50 dark:bg-green-950/20' : ''
                    }`}
                  >
                    {pantryItems.length > 0 ? (
                      pantryItems.map((item, index) => (
                        <PantryItemCard key={item.id} item={item} index={index} />
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No pantry items yet</p>
                        <p className="text-sm">Drag groceries here to track expenses</p>
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </DragDropContext>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="apple-card p-6 rounded-xl text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              ${items.reduce((sum, item) => sum + (item.cost * item.quantity), 0).toFixed(2)}
            </div>
            <div className="text-muted-foreground">Total Value</div>
          </div>
          
          <div className="apple-card p-6 rounded-xl text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {items.reduce((sum, item) => sum + item.quantity, 0)}
            </div>
            <div className="text-muted-foreground">Total Items</div>
          </div>
          
          <div className="apple-card p-6 rounded-xl text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">
              {items.filter(item => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const expirationDate = new Date(item.expiration_date);
                expirationDate.setHours(0, 0, 0, 0);
                const daysDifference = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return item.type === 'pantry' && daysDifference <= 3 && daysDifference >= 0;
              }).reduce((sum, item) => sum + item.quantity, 0)}
            </div>
            <div className="text-muted-foreground">Expiring Soon</div>
          </div>
        </div>

        {/* Recently Added Items */}
        <div className="apple-card p-6 rounded-2xl mt-8">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Recently Added Items</h2>
          
          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-sm font-medium text-muted-foreground pb-3">Item Name</th>
                    <th className="text-left text-sm font-medium text-muted-foreground pb-3">Price</th>
                    <th className="text-left text-sm font-medium text-muted-foreground pb-3">Quantity</th>
                    <th className="text-left text-sm font-medium text-muted-foreground pb-3">Type</th>
                    <th className="text-left text-sm font-medium text-muted-foreground pb-3">Added By</th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 10).map((item) => {
                    const profile = profiles.find(p => p.id === item.added_by_profile_id);
                    return (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-surface-secondary/50">
                        <td className="py-3 text-sm font-medium text-foreground">{item.name}</td>
                        <td className="py-3 text-sm text-foreground">
                          ${(item.cost * item.quantity).toFixed(2)}
                          {item.quantity > 1 && (
                            <span className="text-xs text-muted-foreground ml-2">
                              (${item.cost.toFixed(2)} each)
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-sm text-foreground">{item.quantity}</td>
                        <td className="py-3 text-sm text-foreground capitalize">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.type === 'grocery' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          }`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="py-3 text-sm text-foreground">
                          {profile ? (
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                                style={{ backgroundColor: profile.color }}
                              >
                                {profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <span>{profile.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unknown</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No items added yet</p>
              <p className="text-sm">Items you add will appear here</p>
            </div>
          )}
        </div>

        {/* Archive Confirmation Modal */}
        {archiveConfirm.show && archiveConfirm.item && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="apple-card p-6 rounded-2xl max-w-md w-full mx-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Archive className="w-6 h-6 text-blue-600" />
                </div>
                
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Archive "{archiveConfirm.item.name}"?
                </h3>
                
                <p className="text-muted-foreground mb-6">
                  This will remove the item from your list but keep it in storage for expense calculations and history.
                </p>
                
                <div className="flex space-x-3">
                  <button
                    onClick={cancelArchive}
                    className="flex-1 px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-surface-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => archiveConfirm.item && handleArchiveItem(archiveConfirm.item.id)}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Archive className="w-4 h-4" />
                    <span>Archive Item</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expiration Date Confirmation Modal */}
        {expirationConfirm.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="apple-card p-6 rounded-2xl max-w-md w-full mx-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
                
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Are you sure?
                </h3>
                
                <p className="text-muted-foreground mb-6">
                  Not filling expiration date will exclude this product from expiration analytics and reminders.
                </p>

                <div className="flex items-center space-x-2 mb-6 justify-center">
                  <Checkbox
                    id="dont-remind"
                    checked={expirationConfirm.dontRemindAgain}
                    onCheckedChange={(checked) => 
                      setExpirationConfirm({ 
                        ...expirationConfirm, 
                        dontRemindAgain: checked as boolean 
                      })
                    }
                  />
                  <label 
                    htmlFor="dont-remind" 
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Don't remind me again
                  </label>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={cancelExpirationConfirm}
                    className="flex-1 px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-surface-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExpirationConfirm}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Add Anyway
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="apple-card p-6 rounded-2xl max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-foreground">Edit Item</h3>
                <button
                  onClick={handleCancelEdit}
                  className="p-2 hover:bg-surface-secondary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="apple-input w-full"
                    placeholder="Enter item name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.cost}
                    onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                    className="apple-input w-full"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    className="apple-input w-full"
                    placeholder="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={editForm.expiration_date}
                    onChange={(e) => setEditForm({ ...editForm, expiration_date: e.target.value })}
                    className="apple-input w-full"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleDeleteItem}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors flex items-center justify-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-surface-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
