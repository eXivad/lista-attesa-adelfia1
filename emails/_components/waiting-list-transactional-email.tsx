import type { CSSProperties } from "react";
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";

export interface EmailFragment {
  text: string;
  strong?: boolean;
  href?: string;
}

export type EmailParagraph = EmailFragment[];

export interface WaitingListTransactionalEmailProps {
  organizationName: string;
  heading: string;
  paragraphs: EmailParagraph[];
  logoSrc?: string;
  action?: { label: string; url: string };
}

export function WaitingListTransactionalEmail({
  organizationName,
  heading,
  paragraphs,
  logoSrc,
  action,
}: WaitingListTransactionalEmailProps) {
  return (
    <Html
      lang="it"
      dir="ltr"
      style={{ colorScheme: "light dark", supportedColorSchemes: "light dark" } as CSSProperties}
    >
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{EMAIL_COLOR_SCHEME_CSS}</style>
      </Head>
      <Preview>{heading} — {organizationName}</Preview>
      <Body className="email-body" style={bodyStyle}>
        <Section className="email-page" style={pageStyle}>
          <Container className="email-card" style={cardStyle}>
            <Section className="email-header" style={headerStyle}>
              <Section className="email-header-inner" style={headerInnerStyle}>
                <Row>
                  {logoSrc ? (
                    <Column style={logoColumnStyle}>
                      <Section className="email-logo" style={logoContainerStyle}>
                        <Img
                          src={logoSrc}
                          width="60"
                          alt={`Logo ${organizationName}`}
                          style={logoStyle}
                        />
                      </Section>
                    </Column>
                  ) : null}
                  <Column style={headerTextColumnStyle}>
                    <div className="gmail-blend-screen">
                      <div className="gmail-blend-difference">
                        <div className="email-kicker" style={kickerStyle}>
                          Lista d’Attesa - AGESCI
                        </div>
                        <div className="email-group" style={groupStyle}>
                          {organizationName}
                        </div>
                      </div>
                    </div>
                  </Column>
                </Row>
              </Section>
            </Section>

            <Section className="email-content" style={contentStyle}>
              <Heading as="h1" className="email-heading" style={headingStyle}>
                {heading}
              </Heading>

              {paragraphs.map((paragraph, paragraphIndex) => (
                <Text
                  className="email-copy"
                  key={`paragraph-${paragraphIndex}`}
                  style={copyStyle}
                >
                  {paragraph.map((fragment, fragmentIndex) => (
                    <EmailFragmentView
                      fragment={fragment}
                      key={`fragment-${paragraphIndex}-${fragmentIndex}`}
                    />
                  ))}
                </Text>
              ))}

              {action ? (
                <>
                  <Section style={actionSectionStyle}>
                    <Button
                      className="email-button"
                      href={action.url}
                      style={buttonStyle}
                    >
                      <span className="gmail-blend-screen" style={blockStyle}>
                        <span className="gmail-blend-difference" style={blockStyle}>
                          {action.label}
                        </span>
                      </span>
                    </Button>
                  </Section>
                  <Text className="email-muted" style={fallbackLinkTextStyle}>
                    Se il pulsante non funziona, copia questo indirizzo nel browser:
                    <br />
                    <Link className="email-link" href={action.url} style={fallbackLinkStyle}>
                      {action.url}
                    </Link>
                  </Text>
                </>
              ) : null}

              <Text className="email-copy" style={signOffStyle}>
                Cordiali saluti,
                <br />
                <strong>{organizationName}</strong>
              </Text>
              <Hr className="email-divider" style={dividerStyle} />
              <Text className="email-muted" style={footerStyle}>
                Messaggio automatico inviato da {organizationName}.
              </Text>
            </Section>
          </Container>
        </Section>
      </Body>
    </Html>
  );
}

function EmailFragmentView({ fragment }: { fragment: EmailFragment }) {
  const content = fragment.strong ? <strong>{fragment.text}</strong> : fragment.text;
  return fragment.href ? (
    <Link className="email-link" href={fragment.href} style={linkStyle}>
      {content}
    </Link>
  ) : content;
}

const EMAIL_COLOR_SCHEME_CSS = [
  ":root{color-scheme:light dark;supported-color-schemes:light dark}",
  "u + .email-body .gmail-blend-screen{background:#000000;mix-blend-mode:screen}",
  "u + .email-body .gmail-blend-difference{background:#000000;mix-blend-mode:difference}",
  "@media (prefers-color-scheme:dark){.email-body,.email-page{background-color:#111827!important}.email-card,.email-content{background-color:#1c1917!important}.email-card{border-color:#44403c!important}.email-header,.email-header-inner{background-color:#4c1d95!important;background-image:linear-gradient(#4c1d95,#4c1d95)!important;color:#ffffff!important}.email-content,.email-heading,.email-copy{color:#f5f5f4!important}.email-link{color:#c4b5fd!important}.email-kicker,.email-group,.email-button{color:#ffffff!important}.email-muted{color:#d6d3d1!important}.email-divider{border-color:#57534e!important}.email-logo{background-color:#fafaf9!important;background-image:linear-gradient(#fafaf9,#fafaf9)!important}}",
  "[data-ogsc] .email-body,[data-ogsc] .email-page{background-color:#111827!important}[data-ogsc] .email-card,[data-ogsc] .email-content{background-color:#1c1917!important}[data-ogsc] .email-card{border-color:#44403c!important}[data-ogsc] .email-header,[data-ogsc] .email-header-inner{background-color:#4c1d95!important;background-image:linear-gradient(#4c1d95,#4c1d95)!important;color:#ffffff!important}[data-ogsc] .email-content,[data-ogsc] .email-heading,[data-ogsc] .email-copy{color:#f5f5f4!important}[data-ogsc] .email-link{color:#c4b5fd!important}[data-ogsc] .email-kicker,[data-ogsc] .email-group,[data-ogsc] .email-button{color:#ffffff!important}[data-ogsc] .email-muted{color:#d6d3d1!important}[data-ogsc] .email-divider{border-color:#57534e!important}[data-ogsc] .email-logo{background-color:#fafaf9!important;background-image:linear-gradient(#fafaf9,#fafaf9)!important}",
].join("");

const bodyStyle: CSSProperties = {
  margin: 0,
  backgroundColor: "#f5f5f4",
  color: "#292524",
  fontFamily: "Roboto, Arial, sans-serif",
};

const pageStyle: CSSProperties = {
  width: "100%",
  padding: "24px 12px",
  backgroundColor: "#f5f5f4",
};

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: "600px",
  margin: "0 auto",
  overflow: "hidden",
  border: "1px solid #e7e5e4",
  borderRadius: "16px",
  backgroundColor: "#fafaf9",
};

const headerStyle: CSSProperties = {
  padding: 0,
  backgroundColor: "#4c1d95",
  backgroundImage: "linear-gradient(#4c1d95,#4c1d95)",
  color: "#ffffff",
};

const headerInnerStyle: CSSProperties = {
  padding: "24px 32px",
  backgroundColor: "#4c1d95",
  backgroundImage: "linear-gradient(#4c1d95,#4c1d95)",
  color: "#ffffff",
};

const logoColumnStyle: CSSProperties = {
  width: "92px",
  paddingRight: "16px",
  verticalAlign: "middle",
};

const logoContainerStyle: CSSProperties = {
  width: "76px",
  padding: "8px",
  borderRadius: "12px",
  backgroundColor: "#fafaf9",
  backgroundImage: "linear-gradient(#fafaf9,#fafaf9)",
};

const logoStyle: CSSProperties = {
  display: "block",
  width: "60px",
  maxWidth: "60px",
  height: "auto",
  border: 0,
};

const headerTextColumnStyle: CSSProperties = {
  verticalAlign: "middle",
  color: "#ffffff",
};

const kickerStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const groupStyle: CSSProperties = {
  marginTop: "5px",
  color: "#ffffff",
  fontFamily: '"Roboto Slab", Georgia, serif',
  fontSize: "20px",
  fontWeight: 700,
  lineHeight: 1.3,
  wordBreak: "break-word",
};

const contentStyle: CSSProperties = {
  padding: "32px",
  backgroundColor: "#fafaf9",
  color: "#292524",
};

const headingStyle: CSSProperties = {
  margin: "0 0 24px",
  color: "#292524",
  fontFamily: '"Roboto Slab", Georgia, serif',
  fontSize: "26px",
  fontWeight: 700,
  lineHeight: 1.25,
};

const copyStyle: CSSProperties = {
  margin: "0 0 16px",
  color: "#292524",
  fontSize: "16px",
  lineHeight: 1.55,
};

const linkStyle: CSSProperties = {
  color: "#4c1d95",
  textDecoration: "underline",
};

const actionSectionStyle: CSSProperties = {
  margin: "24px 0",
};

const buttonStyle: CSSProperties = {
  display: "inline-block",
  padding: "12px 18px",
  borderRadius: "8px",
  backgroundColor: "#4c1d95",
  backgroundImage: "linear-gradient(#4c1d95,#4c1d95)",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: 700,
  lineHeight: 1.4,
  textDecoration: "none",
};

const blockStyle: CSSProperties = { display: "block" };

const fallbackLinkTextStyle: CSSProperties = {
  margin: "0 0 16px",
  color: "#57534e",
  fontSize: "13px",
  lineHeight: 1.5,
  wordBreak: "break-all",
};

const fallbackLinkStyle: CSSProperties = {
  color: "#4c1d95",
  textDecoration: "underline",
  wordBreak: "break-all",
};

const signOffStyle: CSSProperties = {
  ...copyStyle,
  margin: "28px 0 0",
};

const dividerStyle: CSSProperties = {
  width: "100%",
  margin: "24px 0 20px",
  border: 0,
  borderTop: "1px solid #e7e5e4",
};

const footerStyle: CSSProperties = {
  margin: 0,
  color: "#57534e",
  fontSize: "13px",
  lineHeight: 1.5,
};

export default WaitingListTransactionalEmail;
