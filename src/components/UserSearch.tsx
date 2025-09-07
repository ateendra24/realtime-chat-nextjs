"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, UserPlus, MessageSquare, UserX } from "lucide-react";

interface User {
  id: string;
  username: string;
  fullName?: string;
  email: string;
  avatarUrl?: string;
}

interface UserSearchProps {
  onUserSelect?: (user: User) => void;
  selectedUsers?: User[];
  placeholder?: string;
  showDirectChatOption?: boolean;
  onDirectChat?: (user: User) => void;
}

export function UserSearch({ onUserSelect, selectedUsers = [], placeholder = "Search users...", showDirectChatOption = false, onDirectChat }: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      if (query.length < 2) {
        setUsers([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setUsers(data.users || []);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleUserSelect = (user: User) => {
    onUserSelect?.(user);
    setQuery("");
    setUsers([]);
  };

  const isUserSelected = (userId: string) => {
    return selectedUsers.some(user => user.id === userId);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Search Results */}
      {(users.length > 0 || loading || (query.length >= 2 && users.length === 0) || (query.length > 0 && query.length < 2)) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-muted-foreground">
              <Search className="h-4 w-4 mx-auto mb-2 animate-pulse" />
              <p>Searching...</p>
            </div>
          ) : query.length > 0 && query.length < 2 ? (
            <div className="p-3 text-center text-muted-foreground">
              <Search className="h-4 w-4 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Type at least 2 characters to search</p>
            </div>
          ) : users.length === 0 && query.length >= 2 ? (
            <div className="p-4 text-center text-muted-foreground">
              <UserX className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium mb-1">No users found</p>
              <p className="text-xs">Try searching with a different term</p>
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 hover:bg-muted"
              >
                <div
                  className="flex items-center space-x-3 flex-1 cursor-pointer"
                  onClick={() => handleUserSelect(user)}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>
                      {user.fullName?.[0] || user.username[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {user.fullName || user.username}
                    </p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {showDirectChatOption && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDirectChat?.(user)}
                      className="h-8 w-8 p-0"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  )}
                  {isUserSelected(user.id) ? (
                    <span className="text-green-600 text-xs">Selected</span>
                  ) : (
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
