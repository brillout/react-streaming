# Injecting Into the SSR Stream

### Rule 1

Nothing should be injected between two React synchronous writes.

- According to React's team, chunks should be injected "before React writes": https://github.com/reactwg/react-18/discussions/114#:~:text=Injecting%20Into%20the%20SSR%20Stream
  - In practice, chunks indeed cannot be arbitrarily injected, as the app will eventually crash otherwise.
  - It isn't clear what "before React writes" means. I interpret it like this: nothing should be injected between two React synchronous writes.
    - So far, my interpreted rule seems to be working.
    - It's also the interpretation of the Apollo GraphQL team: https://github.com/apollographql/apollo-client-nextjs/issues/325#issuecomment-2205375796

### Rule 2

Nothing should be injected before the first React write.

- This doesn't seem to be documented by the React team.
- But, in practice, there seems to (always?) be a hydration mismatch if anything is injected before the first React write.
- Reproduction: https://github.com/vikejs/vike/commit/45e4ffea06335ddbcf2826b0113be7f925617daa
- Thus, we delay any write to the stream until React writes its first chunk.
- Because of Rule 1, all subsequent synchronous React write after the first one also need to be injected first.


### Chunk promises

Being able to pass a chunk promise to `injectToStream()` is required for integrating Apollo GraphQL, see:
- https://github.com/apollographql/apollo-client-nextjs/issues/325#issuecomment-2199664143
- https://github.com/brillout/react-streaming/issues/40
