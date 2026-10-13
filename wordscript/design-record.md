# Design provenance

The user proposed the following behavior in this chat before implementation:

- Four Zero and Forty have numeric value 40 but compare unequal.
- Fourty Three and Four Zero Three have numeric value 403 but compare unequal.
- Fourty Four satisfies the threshold Fourty Three because comparisons inspect components in order.
- Four Four fails that threshold because Four is smaller than Fourty.
- The user explicitly confirmed: "FourtyFour is 44, but Fourty Four is 40 4: 404, space matters".

The assistant formalized this as component lists with lexicographic ordering. The assistant added numeric canonicalization after arithmetic, explicit value normalization, prefix ordering, and a bounded interpreted language subset. These additions are implementation proposals, not claimed human-authored design judgments.

This record was written by AI after the chat design discussion. It is not a substitute for the assignment's requested initial human-written design note.
