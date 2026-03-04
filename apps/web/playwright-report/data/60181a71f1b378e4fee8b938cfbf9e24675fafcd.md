# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: SoulBound
      - generic [ref=e6]: 신뢰 증명 서비스에 로그인하세요
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: 이메일
        - textbox "이메일" [ref=e11]:
          - /placeholder: m@example.com
          - text: test@example.com
      - generic [ref=e12]:
        - generic [ref=e13]: 비밀번호
        - textbox "비밀번호" [ref=e14]: password123
      - paragraph [ref=e15]: Invalid login credentials
      - button "로그인" [ref=e16]
    - button "계정이 없으신가요? 회원가입" [ref=e18]
  - button "Open Next.js Dev Tools" [ref=e24] [cursor=pointer]:
    - img [ref=e25]
  - alert [ref=e28]
```