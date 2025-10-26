import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import { motion } from "framer-motion";

interface SearchMessagesProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchResultCount: number;
    currentResultIndex: number;
    handleNextResult: () => void;
    handlePrevResult: () => void;
    onClose: () => void;
}

export function SearchMessages({
    searchQuery,
    setSearchQuery,
    searchResultCount,
    currentResultIndex,
    handleNextResult,
    handlePrevResult,
    onClose,
}: SearchMessagesProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
        >
            <div className="w-1/3 p-2 border-b border-r border-l rounded-b-xl shadow bg-background absolute right-5 z-10">
                <div className="flex items-center space-x-2">
                    <Input
                        type="text"
                        placeholder="Search messages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8"
                    />
                    {searchResultCount > 0 && (
                        <div className="flex items-center text-sm text-muted-foreground">
                            <span className='truncate'>{currentResultIndex + 1} of {searchResultCount}</span>
                            <Button variant="ghost" size="icon" onClick={handlePrevResult} className="h-8 w-8">
                                <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleNextResult} className="h-8 w-8">
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </motion.div>

    );
}
