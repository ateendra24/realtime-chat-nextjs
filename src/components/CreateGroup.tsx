"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserSearch } from "./UserSearch";
import { X, Users } from "lucide-react";

interface User {
  id: string;
  username: string;
  fullName?: string;
  email: string;
  avatarUrl?: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  type: 'group';
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateGroupProps {
  onGroupCreated?: (group: Group) => void;
  onCancel?: () => void;
}

export function CreateGroup({ onGroupCreated, onCancel }: CreateGroupProps) {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const handleUserSelect = (user: User) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(user => user.id !== userId));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: groupName,
          description,
          participantIds: selectedUsers.map(user => user.id),
          type: "group",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onGroupCreated?.(data.chat);
        // Reset form
        setGroupName("");
        setDescription("");
        setSelectedUsers([]);
      } else {
        console.error("Failed to create group");
      }
    } catch (error) {
      console.error("Error creating group:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Group Name *</label>
          <Input
            placeholder="Enter group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <Input
            placeholder="Enter group description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Add Members *</label>
          <UserSearch
            onUserSelect={handleUserSelect}
            selectedUsers={selectedUsers}
            placeholder="Search users to add..."
          />
        </div>

        {/* Selected Users */}
        {selectedUsers.length > 0 && (
          <div>
            <label className="text-sm font-medium">Selected Members ({selectedUsers.length})</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center space-x-2 bg-muted rounded-full px-3 py-1"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">
                      {user.fullName?.[0] || user.username[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{user.fullName || user.username}</span>
                  <button
                    onClick={() => removeUser(user.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex space-x-2 pt-2">
          <Button
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selectedUsers.length === 0 || loading}
            className="flex-1"
          >
            <Users className="h-4 w-4 mr-2" />
            {loading ? "Creating..." : "Create Group"}
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
