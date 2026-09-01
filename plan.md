1. **Fetch user chats**: We need to determine which chats the user explicitly has access to.
2. **Build capability object**: We need to map `global-updates`, `presence-${userId}`, `user-${userId}`, and the specific `chat-${chat.id}` channels for each user.
3. **Update Ably token request**: Set `capability` in the token request to restrict access.

I will request a plan review for this approach.
