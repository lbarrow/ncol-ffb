<template lang="pug">
  ol.standings-mini
    li.standings-mini__item(v-for="team in teams")
      .standings-mini__photo(:class="'owner-photo--' + team.ownerId")
      .standings-mini__name {{ team.displayName }}
      .standings-mini__record {{team.wins}}-{{team.losses}}
      .standings-mini__streak {{team.streak}}
</template>

<script>
export default {
  name: 'StandingsSummary',
  props: {
    teams: Array
  }
}
</script>

<style lang="scss">
.standings-mini {
  list-style: none;
  margin: 0;
  padding: 0;
}
.standings-mini__item {
  border: 1px solid rgba(white, 0.1);
  background-color: rgba(darken($blue_dark, 5), 0.65);
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  display: grid;
  grid-template-columns: 6rem 1fr auto auto;
  padding: 1rem;
  grid-gap: 2rem;
  align-items: center;
}
.standings-mini__photo {
  width: 6rem;
  height: 6rem;
  border-radius: 100%;
  background-size: contain;
}
.standings-mini__name {
  font-size: 1.8rem;
  font-weight: bold;
}
.standings-mini__record {
  color: $blue;
  font-size: 2rem;
}
.standings-mini__streak {
  opacity: 0.7;
  font-size: 1.5rem;
  padding-right: 1rem;
}
</style>
