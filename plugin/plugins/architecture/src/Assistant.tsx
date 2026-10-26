import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Grid,
  Link,
  Paper,
  Typography,
} from '@material-ui/core';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import {
  ArtifactView,
  AssistantAnswer,
  Environment,
  kindLabels,
} from '@myndigheten/backstage-plugin-architecture-common';
import { TextField } from './Field';
import { useRequest } from './api';
import { ArtifactCard, BlockCard, RichText, to } from './parts';

function Answer({
  question,
  answer,
  items,
  guide,
}: {
  question: string;
  answer: AssistantAnswer;
  items: ArtifactView[];
  guide: Environment;
}) {
  const ids = new Set(items.map(i => i.id));
  const byId = (id: string) => items.find(i => i.id === id);
  const blocks = guide.blocks.filter(b => answer.blocks.includes(b.ref));
  return (
    <Box mt={3}>
      <Typography variant="subtitle2">Du frågade</Typography>
      <Typography paragraph>{question}</Typography>
      {answer.items.length === 0 ? (
        <Typography>
          {answer.inScope
            ? 'Jag hittade ingen vägledning och inget mönster som svarar på frågan. Pröva att beskriva vad du ska bygga, eller sök i listan nedan.'
            : 'Frågan verkar inte handla om att bygga eller ändra en IT-lösning. Beskriv vad du ska bygga, vilka som ska använda det och vad det ska utbyta med andra system.'}
        </Typography>
      ) : (
        <>
          <RichText value={answer.summary} ids={ids} />
          <Typography variant="body2" color="textSecondary" paragraph>
            Svaret är skrivet av en språkmodell utifrån styrningen och kan vara
            ofullständigt. Det som gäller står i posterna nedan.
          </Typography>
          <Typography variant="subtitle2">Det här gäller din fråga</Typography>
          {answer.items.map(
            i =>
              byId(i.id) && (
                <ArtifactCard key={i.id} a={byId(i.id)!} note={i.why} />
              ),
          )}
          {answer.others.length > 0 && (
            <Box my={2}>
              <Typography variant="subtitle2">Kan också gälla</Typography>
              {answer.others.map(
                other =>
                  byId(other.id) && (
                    <Typography key={other.id}>
                      <Link component={RouterLink} to={to(other.id)}>
                        {byId(other.id)!.title}
                      </Link>{' '}
                      <Typography component="span" color="textSecondary">
                        {kindLabels[byId(other.id)!.kind]} · {other.why}
                      </Typography>
                    </Typography>
                  ),
              )}
            </Box>
          )}
          {answer.alternatives.length > 0 && (
            <Box my={2}>
              <Typography variant="subtitle2">
                Vägledningarna leder också till
              </Typography>
              {answer.alternatives.map(
                (alternative, i) =>
                  byId(alternative.id) && (
                    <Typography key={i}>
                      <Link component={RouterLink} to={to(alternative.id)}>
                        {byId(alternative.id)!.title}
                      </Link>{' '}
                      <Typography component="span" color="textSecondary">
                        {kindLabels[byId(alternative.id)!.kind]} ·{' '}
                        {alternative.when}
                      </Typography>
                    </Typography>
                  ),
              )}
            </Box>
          )}
          {blocks.length > 0 && (
            <Box my={2}>
              <Typography variant="subtitle2" gutterBottom>
                Byggstenar du använder
              </Typography>
              <Grid container spacing={2}>
                {blocks.map(b => (
                  <Grid item xs={12} md={6} lg={4} key={b.id}>
                    <BlockCard block={b} guide={guide} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
          {answer.basis.length > 0 && (
            <Box my={2}>
              <Typography variant="subtitle2">Bindande regler bakom</Typography>
              {answer.basis.map(
                id =>
                  byId(id) && (
                    <Typography key={id}>
                      <Link component={RouterLink} to={to(id)}>
                        {byId(id)!.title}
                      </Link>{' '}
                      <Typography component="span" color="textSecondary">
                        {kindLabels[byId(id)!.kind]} · {id}
                      </Typography>
                    </Typography>
                  ),
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

/** Takes a description of what the reader is about to do, and shows the governance that applies. */
export function Assistant({
  items,
  guide,
}: {
  items: ArtifactView[];
  guide: Environment;
}) {
  const request = useRequest();
  // Folded by default, so that the guide itself comes first. What has been asked stays when it is folded again.
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<
    { question: string; answer: AssistantAnswer }[]
  >([]);
  const ask = async () => {
    const asked = question.trim();
    setBusy(true);
    setError('');
    try {
      const answer = await request<AssistantAnswer>('/assistant', {
        method: 'POST',
        body: JSON.stringify({ question: asked }),
      });
      // The latest answer is shown first. Each question is answered on its own.
      setAnswers(earlier => [{ question: asked, answer }, ...earlier]);
      setQuestion('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Box component={Paper} p={2} mb={3}>
      <ButtonBase
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="assistant"
        style={{ width: '100%', justifyContent: 'space-between' }}
      >
        <Typography variant="h6" component="h2">
          Odin
        </Typography>
        <Box display="flex" alignItems="center">
          <Typography variant="body2" color="textSecondary">
            {open ? 'Dölj' : 'Fråga om vad som gäller för det du ska bygga'}
          </Typography>
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
      </ButtonBase>
      {open && (
        <Box id="assistant" mt={2}>
          <Typography variant="body2" color="textSecondary" paragraph>
            Skriv vad du ska bygga eller ändra, vilka som ska använda det och
            vad det ska utbyta med andra system. Du får de vägledningar,
            mönster, byggstenar och regler som gäller.
          </Typography>
          <TextField
            label="Din fråga"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            variant="outlined"
            inputProps={{ maxLength: 2000 }}
            disabled={busy}
          />
          <Box mt={1} display="flex" alignItems="center">
            <Button
              variant="contained"
              color="primary"
              onClick={ask}
              disabled={busy || !question.trim()}
            >
              Fråga
            </Button>
            {busy && (
              <Box ml={2} display="flex" alignItems="center">
                <CircularProgress size={20} aria-label="Läser styrningen" />
                <Box ml={1}>
                  <Typography variant="body2">
                    Läser styrningen. Det tar omkring en minut.
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
          {error && (
            <Typography color="error" role="alert">
              {error}
            </Typography>
          )}
          {answers.map((a, i) => (
            <Answer
              key={answers.length - i}
              {...a}
              items={items}
              guide={guide}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
