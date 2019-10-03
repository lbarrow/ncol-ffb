<template lang="pug">
  .matchup-page
    .matchup-page__inner(v-if="matchup")
      h2.page-title
        .page-title__sub Matchup
        .page-title__main Week {{matchup.week}}
    .matchup
      .matchup-team(v-for="team in teams" :key="team.ownerId")
        .matchup-team__header
          matchup-header(:owner="team.owner" :total="team.teamTotal")
        ul.matchup-positions
          li.matchup-position(v-for="position in team.positions" :key="position._id")
            h3.matchup-position__title {{position._id}}s
            ul.matchup-players
              li.matchup-players__item(v-for="index in position.playerRowsToRender")
                  matchup-player(v-if="position.players[index - 1]" :player="position.players[index - 1]")
                  matchup-player(v-else :spacer="true")
</template>

<script>
import MatchupHeader from '@/components/MatchupHeader.vue'
import MatchupPlayer from '@/components/MatchupPlayer.vue'
import axios from 'axios'

export default {
  name: 'Matchup',
  components: {
    MatchupHeader,
    MatchupPlayer
  },
  data() {
    return {
      matchup: {},
      teams: []
    }
  },
  async mounted() {
    const API_URL = `http://localhost:4444/matchup/${this.$route.params.id}`
    const response = await axios.get(API_URL)
    this.matchup = response.data.matchup
    this.teams = response.data.teams
  }
}
</script>

<style lang="scss">
.matchup {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 6rem;
}
.matchup-team {
  border: 1px solid rgba(white, 0.1);
  padding-bottom: 1rem;
}
.matchup-team__header {
}
.matchup-positions {
  padding: 0 2rem;
}
.matchup-position {
  padding: 2rem 0 1rem;
  position: relative;
}
.matchup-position__title {
  font-family: $font_ideal;
  font-size: 1.2rem;
  letter-spacing: 0.3rem;
  position: absolute;
  left: calc(100% + 2.3rem);
  top: 4.2rem;
  opacity: 0.75;
  text-align: center;
  width: 6rem;
}
.matchup-team:last-child {
  .matchup-position__title {
    display: none;
  }
}
.matchup-players {
}
.matchup-players__item {
  /* border-bottom: 1px solid rgba(white, 0.1); */
  margin-bottom: 0.8rem;
  &:last-child {
    margin-bottom: 0;
    /* border-bottom: none; */
  }
}
</style>
